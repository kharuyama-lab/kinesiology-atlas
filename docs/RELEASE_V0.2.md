# Anatomy v0.2 検証・変更ログ

実施日: 2026-10-30（日本時間）。Anatomy優先の開発版。関節中心・軸の解剖学的検証FIX前です。

## UI追補

- 左の筋リストと選択欄は日本語名のみ。日英名はホバーのポップアップと3Dクリックのフロートに表示。
- 表示切替フロートを左下固定から、クリック／タップ位置の近くに変更。画面端では内側に収め、タッチ操作できる44pxのボタンを配置。OFF後もその位置でONへ戻せます。
- 空白クリックや3D回転開始でフロートを閉じます。左の組織操作は閉じたフロートを勝手に開きません。
- 構文・ロジック検査と実GLBのEdge回帰テストを再実行しPASS。筋の日本語行、クリック位置付近への配置、フロートからの表示変更と左選択欄の同期を確認。[確認画面](screenshots/selection-near-muscle.png)。

## 対象と保護範囲

- 対象は `kharuyama-lab/kinesiology-atlas`、基点 `acf668c`、作業ブランチ `feat/anatomy-v0.2`。
- `kharuyama-lab/hip-kinesiology` は取得・変更・push・公開設定変更を一切行っていません。Atlas内の `legacy/hip/index.html` も変更していません。
- 参照会話の直近5ユーザー発言を取得。さらに古い履歴とアシスタント本文は参照ツールから取得できなかったため、今回の依頼本文を実装仕様としています。

## 修正した不具合・挙動

1. Hip/Knee Focusで骨盤等の骨格を隠していた処理を廃止。277骨格構造を常時保持。
2. Mode 2への変更が強制的にKnee Focus・初期角度・カメラへ戻していた処理を分離。ModeとFocusを独立状態に変更。
3. 独立Hip iframeのボタンを共通モードから除去。同じシーンのままHip Focusを保持。
4. 筋・靭帯・半月板は各組織ON→Fade（30%不透明）→OFF。プルダウン廃止。左行・選択欄・浮動操作で同期。
5. 広筋3筋の登録名に不足していた `muscle` を補完。大腿直筋を含む四頭筋4筋は実データに収録済みで有効化。
6. 複数プリミティブを持つ筋の子メッシュ名を解剖学的識別子と誤認しないよう、`extras.za_name` のみで親を解決。
7. 股関節の主要筋と靭帯を登録し、Focus別に関連組織を設定。二関節筋の特別な学習モードは追加していません。
8. 左骨格が右骨格を手前から覆う投影範囲で自動Fade。右骨格の不透明度は維持。
9. カメラの側方符号を左右大腿骨の位置で決定。右股・右膝中心をFocus基準にし、Whole Bodyも右股中心を基準に距離を調整。
10. Mode切替の肢位は補間。膝の移動分だけカメラとtargetを平行移動し、視線方向・ズーム・panを維持。
11. 右足部の骨格も下腿リグへ追従。手動GLB再読込は元データから再構築し、姿勢の二重適用・重複登録を防止。
12. 専門用語は日英表記、一般UIは英語。不要なRight接頭辞と独立したスクリューホーム等のトグルはありません。

## 検証結果

- `npm run check`: PASS。
- `npm test`: 3/3 PASS。既存運動ロジック、表示循環・Focus関連性、実GLB全39組織の完全一致、全277骨格ノードの日本語名対応。
- `npm run test:ui`: PASS（Windows版Edge、headless、実GLB、ローカルHTTP、Three.js/Dracoはnpm内の同一バージョンに差替）。シナリオ1件で以下を確認。
  - 277骨格＋39組織＝316構造。全39組織がメッシュを持ち、初期表示で描画対象。
  - Whole Body/Hip/Kneeの全骨格維持。右股・右膝が描画領域中央。
  - 広筋の有効化、表示3状態の循環、Medial時の左Fade・Lateral時の復帰。
  - Mode変更で同じcanvas、Focus・表示状態・カメラ方向/距離を保持し、肢位だけ変更。
  - Kneeの内外反設定、軸ON/OFF状態保持、Anatomyへ戻した際の肢位復帰。
  - 実3Dクリックから浮動UIを操作し左選択欄と同期。
  - Whole Bodyによるホーム復帰。Hip/Whole BodyでもMode切替でFocus・状態維持。
  - 曲がった姿勢からGLB手動再読込して登録数不変、全身へ復帰。
  - 1440×1000と390×844の表示。ページのJavaScript例外なし。
- 画面を目視確認: [全身](screenshots/whole-body.png)、[股](screenshots/hip-anatomy.png)、[膝](screenshots/knee-anatomy.png)、[Mode 2試作](screenshots/knee-mode2.png)、[mobile](screenshots/mobile.png)。
- 実データ取得元・サイズ・SHA-256は [GLB_MANIFEST.json](GLB_MANIFEST.json)。外部配信のGLBを取得して検証しましたが、公開サーバー上の通しテストや実機タッチ検証は行っていません。

## 再現手順

Node.jsとEdgeを用意し、`npm ci`。次の3ファイルを `.cache/` に保存します。GLBはGitにも配布ZIPにも含めません。

- https://nqwrc.github.io/3d-anatomy/models/skeletal.glb
- https://nqwrc.github.io/3d-anatomy/models/joints.glb
- https://nqwrc.github.io/3d-anatomy/models/muscular.glb

`npm run check`、`npm test`、`npm run test:ui` を実行。`test-results/` に画面を保存します。普段の起動は `npm run serve`。外部通信を使わず取得済みGLBで起動する場合は `/?localModels`、読み取り専用検証スナップショットを有効にする場合は `&qa` を付けます。

## 残る制約と次工程

今回完了した範囲はAnatomy v0.2とシームレス切替基盤です。Mode 2完成版ではありません。

- 関節中心は骨形状からの暫定推定。中心・運動軸を検証FIXするまでカメラ最終FIXと生体運動の正確性は未確定。
- Mode 2 Kneeは既存の模式運動を維持。股90°/膝90°、内外反時は膝30°。スクリューホーム・半月板・膝蓋骨は屈伸に従属しますが、軌道は未校正。
- 筋は元の静止メッシュのまま。Mode 2の曲がった肢位へ変形しません。靭帯は大腿側への剛体追従、半月板は脛骨への剛体追従、膝蓋骨は模式的な小移動です。力・張力の計算や生理的変形は未実装。
- Hipの完成済み運動UIは共通シーンに未統合。Hip FocusとModeの状態保持のみ対応。
- 左Fadeは境界箱の投影重なりによる近似で、厳密なピクセル遮蔽検出ではありません。
- 順序: 関節中心・軸検証FIX → カメラ最終FIX → 関節運動 → 靭帯動態。断面・二関節筋専用機能・CKC reverse actionは保留。
