# Kinesiology Atlas — Anatomy v0.2

Anatomy優先の改修版と、同一3DシーンでJoint Kinesiologyへ切り替える基盤です。既存の `kharuyama-lab/hip-kinesiology` は変更していません。

## 起動

Node.jsを用意し、フォルダー内で `npm run serve` を実行して http://127.0.0.1:8080/ を開きます。静的ホスティングにも配置可能です。Three.jsとDracoは同梱済みです。ローカル確認では保存済みの `.cache/` 内GLBを自動で優先し、公開ホスティングではGLBを外部から取得します。GLB取得に失敗した場合はDiagnosticsから `skeletal.glb / joints.glb / muscular.glb` を読み込めます。ライセンスはCREDITS_AND_LICENSES.mdを保持してください。

## 操作

- Mode 1 = Anatomy、Mode 2 = Joint Kinesiology。
- Focus = Whole Body / Hip / Knee。Whole Bodyは意図的なホーム操作で、全身の標準表示・肢位・カメラへ戻ります。選択中のModeは維持します。
- Focus変更で関係する筋・靭帯をON、それ以外をOFFにします。両側の骨格は常時保持します。
- 筋・靭帯はON → Fade（30%不透明）→ OFFの1クリック循環。3Dクリックのフローティング操作と左パネルが同期します。
- Whole Bodyの左パネルは骨／靭帯・軟骨／筋肉の3一括操作が基本。その下のIndividualを開くと個別操作できます（初期状態は閉）。混在状態はMixed、一括クリックで全件ON。Hip/Kneeでは関連する組織だけを個別操作し、全身骨格をONへ復帰します。
- 左骨格は右骨格を手前から隠す投影範囲で自動Fade。Lateral / Medialは右外側 / 右内側です。
- Mode切替はFocus、表示状態、視線方向、ズーム、選択、共通UIを維持。膝の肢位変化中はカメラ中心も追従します。

## 関節運動の検証

関節・半月板の確認は `http://127.0.0.1:8080/?review=knee&axis=condyle`。Auto/Pauseで往復・停止できます。骨軌道とScrew-homeを維持し、半月板は根を保持して脛骨の支持曲面に沿って移動、膝蓋骨は滑車部を遠位へたどります。検証域は0〜120°。関節面・軟骨の適合性は未承認。[骨配置](docs/MESH_CONTACT_CORRECTION.md)・[曲面追従](docs/SURFACE_TRACKING_REVIEW.md) を参照。筋・靭帯の追加調整は後続です。

## 検証

`npm ci` → `npm run check` → `npm test`。

実GLBを使うUIテストは、3ファイルを `.cache/` に取得し `npm run test:ui` を実行します。Windows版Edgeを使用します。詳細と取得先はdocs/RELEASE_AND_QC.mdを参照してください。

## 今回の到達点

Anatomyの表示・FocusとMode切替基盤を確認済み。Mode 2の膝運動と筋の模式追従を実装しています。関節中心・軸は未校正で、筋の追従も実測付着部や筋力・ひずみを再現するものではありません。関節中心・軸の検証FIX → カメラ最終FIX → 運動軌道 → 靭帯動態の順で精度を上げます。Hip運動の統合、断面、二関節筋専用機能、CKC reverse actionは保留です。
