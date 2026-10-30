# Kinesiology Atlas — Anatomy v0.2

Anatomy優先の改修版と、同一3DシーンでJoint Kinesiologyへ切り替える基盤です。既存の `kharuyama-lab/hip-kinesiology` は変更していません。

## 起動

Node.jsを用意し、フォルダー内で `npm run serve` を実行して http://127.0.0.1:8080/ を開きます。静的ホスティングにも配置可能です。GLBとThree.jsは外部から取得します。GLB取得に失敗した場合はDiagnosticsから `skeletal.glb / joints.glb / muscular.glb` を読み込めます。ライセンスはCREDITS_AND_LICENSES.mdを保持してください。

## 操作

- Mode 1 = Anatomy、Mode 2 = Joint Kinesiology。
- Focus = Whole Body / Hip / Knee。Whole Bodyは意図的なホーム操作で、全身の標準表示・肢位・カメラへ戻ります。選択中のModeは維持します。
- Focus変更で関係する筋・靭帯をON、それ以外をOFFにします。両側の骨格は常時保持します。
- 筋・靭帯はON → Fade（30%不透明）→ OFFの1クリック循環。3Dクリックのフローティング操作と左パネルが同期します。
- Whole Bodyの左パネルは骨／靭帯・軟骨／筋肉の3一括操作のみ。Hip/Kneeでは関連する組織の個別操作に戻り、全身骨格をONへ復帰。Whole Bodyの3Dフロート操作もAllで同じグループを一括変更します。
- 左骨格は右骨格を手前から隠す投影範囲で自動Fade。Lateral / Medialは右外側 / 右内側です。
- Mode切替はFocus、表示状態、視線方向、ズーム、選択、共通UIを維持。膝の肢位変化中はカメラ中心も追従します。

## 検証

`npm ci` → `npm run check` → `npm test`。

実GLBを使うUIテストは、3ファイルを `.cache/` に取得し `npm run test:ui` を実行します。Windows版Edgeを使用します。詳細と取得先はdocs/RELEASE_AND_QC.mdを参照してください。

## 今回の到達点

Anatomyの表示・FocusとMode切替基盤を確認済み。Mode 2の既存膝運動は未校正の試作を維持しています。筋は静止形状で、曲がった肢位への変形は未実装です。関節中心・軸の検証FIX → カメラ最終FIX → 関節運動 → 靭帯動態の順で進めます。Hip運動の統合、断面、二関節筋、CKC reverse actionは保留です。
