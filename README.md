# rtl-vericad

## 単体ブラウザ版（MVPプロトタイプ）

前提: Node.js（npm）

起動:

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:5173/` を開いてください。

実装済み（最小）:
- モジュール作成/配置
- 配線（直交）
- 選択/削除
- グリッド表示
- Undo/Redo
- JSON 保存/読込（ダウンロード/ファイル選択）