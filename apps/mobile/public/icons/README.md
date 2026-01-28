# PWA 아이콘 폴더

이 폴더에 앱 아이콘을 배치해야 합니다.

## 필요한 아이콘 크기

| 파일명 | 크기 | 용도 |
|--------|------|------|
| icon-72x72.png | 72x72 | Android 기본 아이콘 |
| icon-96x96.png | 96x96 | Android 기본 아이콘 |
| icon-128x128.png | 128x128 | Chrome Web Store |
| icon-144x144.png | 144x144 | Android Launcher (maskable) |
| icon-192x192.png | 192x192 | Android Launcher (maskable) |
| icon-256x256.png | 256x256 | Windows 타일 |
| icon-384x384.png | 384x384 | Chrome splash (maskable) |
| icon-512x512.png | 512x512 | iOS spotlight, Chrome splash (maskable) |

## 아이콘 생성 권장사항

- **PNG 형식**으로 제공
- maskable 아이콘은 대상 이미지가 중앙에 위치하고 10% 여백을 남겨야 함
- `sharp` 또는 `ImageMagick`으로 단일 소스 이미지(최소 512x512)에서 모든 크기를 생성 가능

## 빠른 생성 예시 (ImageMagick)

```bash
# 기본 소스 이미지: source-icon.png (1024x1024)
for size in 72 96 128 144 192 256 384 512; do
  convert source-icon.png -resize ${size}x${size} icon-${size}x${size}.png
done
```
