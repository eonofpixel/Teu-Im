use tauri::Manager;

mod audio;

/// 앱 버전 반환
#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// 앱 이름 반환
#[tauri::command]
fn get_app_name() -> String {
    "Teu-Im".to_string()
}

/// 기본 ping 명령어
#[tauri::command]
async fn ping() -> String {
    "pong".to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    pretty_env_logger::init();

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_app_version,
            get_app_name,
            ping,
            audio::list_audio_devices,
            audio::start_audio_capture,
            audio::stop_audio_capture,
        ])
        .setup(|app| {
            // 개발 모드에서 DevTools 자동 열기
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Teu-Im 앱 실행 실패");
}
