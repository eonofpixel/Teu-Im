use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, SampleFormat, SupportedStreamConfig};
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioDevice {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct AudioData {
    pub samples: Vec<i16>,
    pub sample_rate: u32,
}

// 전역 중지 플래그
static STOP_FLAG: AtomicBool = AtomicBool::new(false);
static IS_RUNNING: AtomicBool = AtomicBool::new(false);

/// 오디오 입력 장치 목록 조회
#[tauri::command]
pub fn list_audio_devices() -> Result<Vec<AudioDevice>, String> {
    let host = cpal::default_host();
    let mut devices = Vec::new();

    // 기본 입력 장치
    if let Some(device) = host.default_input_device() {
        if let Ok(name) = device.name() {
            devices.push(AudioDevice {
                id: "default".to_string(),
                name: format!("{} (기본)", name),
            });
        }
    }

    // 모든 입력 장치
    if let Ok(input_devices) = host.input_devices() {
        for (idx, device) in input_devices.enumerate() {
            if let Ok(name) = device.name() {
                devices.push(AudioDevice {
                    id: format!("device_{}", idx),
                    name,
                });
            }
        }
    }

    Ok(devices)
}

/// 오디오 캡처 시작
#[tauri::command]
pub fn start_audio_capture(app: AppHandle, device_id: String) -> Result<(), String> {
    // 이미 실행 중이면 에러
    if IS_RUNNING.load(Ordering::SeqCst) {
        return Err("오디오 캡처가 이미 실행 중입니다".to_string());
    }

    let host = cpal::default_host();

    // 장치 선택
    let device: Device = if device_id == "default" {
        host.default_input_device()
            .ok_or("기본 입력 장치를 찾을 수 없습니다")?
    } else {
        let idx: usize = device_id
            .strip_prefix("device_")
            .and_then(|s| s.parse().ok())
            .ok_or("잘못된 장치 ID")?;

        host.input_devices()
            .map_err(|e| e.to_string())?
            .nth(idx)
            .ok_or("장치를 찾을 수 없습니다")?
    };

    let device_name = device.name().unwrap_or_default();
    log::info!("오디오 캡처 시작: {}", device_name);

    // 장치의 기본 설정 사용
    let config = device
        .default_input_config()
        .map_err(|e| format!("기본 설정 조회 실패: {}", e))?;

    log::info!(
        "오디오 설정: {} 채널, {}Hz, {:?}",
        config.channels(),
        config.sample_rate().0,
        config.sample_format()
    );

    // 플래그 초기화
    STOP_FLAG.store(false, Ordering::SeqCst);
    IS_RUNNING.store(true, Ordering::SeqCst);

    // 별도 스레드에서 오디오 캡처 실행
    thread::spawn(move || {
        run_audio_capture(device, config, app);
    });

    Ok(())
}

fn run_audio_capture(device: Device, config: SupportedStreamConfig, app: AppHandle) {
    let sample_rate = config.sample_rate().0;
    let channels = config.channels() as usize;
    let sample_format = config.sample_format();

    let err_fn = |err| log::error!("오디오 스트림 오류: {}", err);

    let stream = match sample_format {
        SampleFormat::F32 => build_stream_f32(&device, &config.into(), channels, sample_rate, app.clone(), err_fn),
        SampleFormat::I16 => build_stream_i16(&device, &config.into(), channels, sample_rate, app.clone(), err_fn),
        SampleFormat::U16 => build_stream_u16(&device, &config.into(), channels, sample_rate, app.clone(), err_fn),
        _ => {
            log::error!("지원하지 않는 샘플 포맷: {:?}", sample_format);
            IS_RUNNING.store(false, Ordering::SeqCst);
            return;
        }
    };

    let stream = match stream {
        Ok(s) => s,
        Err(e) => {
            log::error!("스트림 생성 실패: {}", e);
            IS_RUNNING.store(false, Ordering::SeqCst);
            return;
        }
    };

    if let Err(e) = stream.play() {
        log::error!("스트림 시작 실패: {}", e);
        IS_RUNNING.store(false, Ordering::SeqCst);
        return;
    }

    log::info!("오디오 캡처 스트림 시작됨 ({}Hz)", sample_rate);

    // 중지 플래그가 설정될 때까지 대기
    while !STOP_FLAG.load(Ordering::SeqCst) {
        thread::sleep(std::time::Duration::from_millis(100));
    }

    drop(stream);
    IS_RUNNING.store(false, Ordering::SeqCst);
    log::info!("오디오 캡처 중지됨");
}

fn build_stream_f32(
    device: &Device,
    config: &cpal::StreamConfig,
    channels: usize,
    sample_rate: u32,
    app: AppHandle,
    err_fn: impl Fn(cpal::StreamError) + Send + 'static,
) -> Result<cpal::Stream, cpal::BuildStreamError> {
    device.build_input_stream(
        config,
        move |data: &[f32], _: &cpal::InputCallbackInfo| {
            // 모노로 변환 (첫 번째 채널만 사용)
            let mono: Vec<i16> = data
                .chunks(channels)
                .map(|frame| {
                    let sample = frame[0].clamp(-1.0, 1.0);
                    if sample < 0.0 {
                        (sample * 32768.0) as i16
                    } else {
                        (sample * 32767.0) as i16
                    }
                })
                .collect();

            let _ = app.emit("audio-data", AudioData {
                samples: mono,
                sample_rate,
            });
        },
        err_fn,
        None,
    )
}

fn build_stream_i16(
    device: &Device,
    config: &cpal::StreamConfig,
    channels: usize,
    sample_rate: u32,
    app: AppHandle,
    err_fn: impl Fn(cpal::StreamError) + Send + 'static,
) -> Result<cpal::Stream, cpal::BuildStreamError> {
    device.build_input_stream(
        config,
        move |data: &[i16], _: &cpal::InputCallbackInfo| {
            // 모노로 변환
            let mono: Vec<i16> = data
                .chunks(channels)
                .map(|frame| frame[0])
                .collect();

            let _ = app.emit("audio-data", AudioData {
                samples: mono,
                sample_rate,
            });
        },
        err_fn,
        None,
    )
}

fn build_stream_u16(
    device: &Device,
    config: &cpal::StreamConfig,
    channels: usize,
    sample_rate: u32,
    app: AppHandle,
    err_fn: impl Fn(cpal::StreamError) + Send + 'static,
) -> Result<cpal::Stream, cpal::BuildStreamError> {
    device.build_input_stream(
        config,
        move |data: &[u16], _: &cpal::InputCallbackInfo| {
            // u16 -> i16 변환 및 모노로 변환
            let mono: Vec<i16> = data
                .chunks(channels)
                .map(|frame| (frame[0] as i32 - 32768) as i16)
                .collect();

            let _ = app.emit("audio-data", AudioData {
                samples: mono,
                sample_rate,
            });
        },
        err_fn,
        None,
    )
}

/// 오디오 캡처 중지
#[tauri::command]
pub fn stop_audio_capture() -> Result<(), String> {
    STOP_FLAG.store(true, Ordering::SeqCst);

    // 스레드가 종료될 때까지 잠시 대기
    let mut wait_count = 0;
    while IS_RUNNING.load(Ordering::SeqCst) && wait_count < 20 {
        thread::sleep(std::time::Duration::from_millis(50));
        wait_count += 1;
    }

    Ok(())
}
