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

関節の確認は `http://127.0.0.1:8080/?review=knee&axis=condyle`。半月板は根を保持し、屈伸・回旋・内外反の推定接触点へ荷重支持部が追従。閉じる側に暫定的な高さ縮小を加えます。膝蓋骨は滑車部をたどり、左の「膝蓋骨」または3DフロートでON/Fade/OFFを選べます。Auto/Pauseで往復可能。検証域は0〜120°。荷重・軟骨接触は未承認。[骨配置](docs/MESH_CONTACT_CORRECTION.md)・[曲面追従](docs/SURFACE_TRACKING_REVIEW.md)・[接触中心拘束](docs/CONTACT_CENTRE_MENISCI.md) を参照。

## 検証

`npm ci` → `npm run check` → `npm test`。

実GLBを使うUIテストは、3ファイルを `.cache/` に取得し `npm run test:ui` を実行します。Windows版Edgeを使用します。詳細と取得先はdocs/RELEASE_AND_QC.mdを参照してください。

## 今回の到達点

Anatomyの表示・FocusとMode切替基盤を確認済み。Mode 2の膝運動と筋の模式追従を実装しています。関節中心・軸は未校正で、筋の追従も実測付着部や筋力・ひずみを再現するものではありません。関節中心・軸の検証FIX → カメラ最終FIX → 運動軌道 → 靭帯動態の順で精度を上げます。Hip運動の統合、断面、二関節筋専用機能、CKC reverse actionは保留です。

## Hip復元・膝の筋肉（2026-11-02）

Hipは既存Hip版の3方向の運動・Auto・筋識別色・作用の濃淡・靭帯の緊張表現を共通Sceneへ移植。Hip/Kneeの共通筋は同じメッシュを使います。膝筋の追従は脛骨のすべりと膝蓋骨の移動を含みます。確認用URLは `/?review=muscles&axis=condyle`。形状追従・作用色は教材用近似で、筋力や実測伸張率ではありません。変更・検証の詳細は [docs/SHARED_MUSCLES_AND_HIP.md](docs/SHARED_MUSCLES_AND_HIP.md)。

筋走行の修正：前回の筋全長への回転配分を見直し、筋腹を対応する骨側へ追従。アキレス腱、腸脛靭帯の初期FadeとTFL/大殿筋との連動、膝4筋群とHip6筋群の一括表示を追加。最新の修正と画像は [docs/MUSCLE_ROUTING_CORRECTION.md](docs/MUSCLE_ROUTING_CORRECTION.md) を参照してください。

筋の起始付近のヘアピン・局所的な折れに対し、長い筋を全長で連続変形させる方式へ変更。変形後の当たり判定用包囲箱も更新し、膝に表示する16筋・腱の実表面でホバーを検査。最新の検証範囲と限界は [docs/CONTINUOUS_MUSCLES_AND_PICKING.md](docs/CONTINUOUS_MUSCLES_AND_PICKING.md)。

最新修正：単純な端点間曲線への変形を撤回し、元の筋走行を基準に変更。四頭筋の元メッシュに含まれる腱部は膝蓋骨経由で脛骨へ追従します。角度欄は日本語・固定幅・等幅数字。詳細は [docs/SOURCE_SURFACE_AND_ANGLE_FIX.md](docs/SOURCE_SURFACE_AND_ANGLE_FIX.md)。

## 膝屈曲時の筋走行の修正

腓腹筋の下腿後面保持、四頭筋の膝蓋骨経路、内側筋群と大腿二頭筋の停止部追従を修正。[変更・検証記録](docs/BONE_RELATIVE_MUSCLE_ROUTES.md)を参照。

薄筋などの局所的な折れを全長短縮へ変更し、縫工筋の浅層関係とLCL・膝窩筋の深さを補正。[今回の記録](docs/WHOLE_MUSCLE_SHORTENING.md)。
