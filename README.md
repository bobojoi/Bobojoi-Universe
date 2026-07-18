# Bobojoi Universe

以 Phaser 3、TypeScript 與 Vite 建立的可持續擴充遊戲專案。目前版本提供泡泡工作室場景、WASD 移動、鏡頭跟隨、角色互動，以及版本化的本機存檔基礎。

## 開始使用

```bash
npm install
npm run dev
```

開啟 Vite 顯示的網址後，使用 `WASD` 移動；靠近泡妞或泡彈時按 `E` 互動。

## 品質檢查

```bash
npm run typecheck
npm run build
```

網址加入 `?debug` 可顯示 Arcade Physics 碰撞範圍。

## 架構

- `src/scene/`：生命週期與世界組裝。
- `src/character/`：角色行為與物理。
- `src/system/`：可跨場景重用的對話、互動及存檔邏輯。
- `src/ui/`：固定於鏡頭的介面。
- `src/config/`、`src/constants/`：全域設定與穩定識別值。
- `assets/`：未來正式圖像、音效、UI 與地圖素材。

場景只負責組裝，各角色與系統保持獨立，後續可在不改動互動核心的情況下替換正式素材、加入任務、NPC AI 或更多房間。
