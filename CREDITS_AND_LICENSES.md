# Credits / licenses

閲覧用の一覧は [credits.html](credits.html)。独自部分は [LICENSE.md](LICENSE.md) と [学習・教育目的の利用方針](TERMS_OF_USE.md) を参照してください。第三者コンテンツの既存の権利は制限しません。

## Required anatomy attributions

BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1 Japan

Z-Anatomy - The open source atlas of anatomy - CC-BY-SA 4.0

元の指定と全体配布条件は `third_party/3d-anatomy/` に原文で保持。表示に使う3ファイルと確認版は `config/model-assets.js` に固定し、読み込み時にSHA-256を照合します。名称対応、配色、肢位、関節運動、教育用の筋・靭帯変形を加えています。

- Z-Anatomy 3D Atlas: https://www.z-anatomy.com/
- Original BodyParts3D project: https://lifesciencedb.jp/bp3d/
- Public web GLB derivative: https://github.com/nqwrc/3d-anatomy and https://nqwrc.github.io/3d-anatomy/
- glTF models are not bundled in this project; at runtime they are fetched from the upstream site.
- Upstream license summary: models derive from BodyParts3D (CC BY-SA 2.1 JP), Z-Anatomy (CC BY-SA 4.0). Upstream's complete compilation contains two non-commercial components (inner ear and kidney) and is distributed as CC BY-NC-SA 4.0; see its LICENSE, NOTICE, public/models/License.txt, and attribution requirements before mirroring or redistributing models.
- Three.js https://threejs.org/ MIT License, pinned 0.160.0 runtime bundled under `vendor/three`; license included.
- Draco decoders https://google.github.io/draco/ Apache-2.0, bundled from the pinned Three.js package; license included under `vendor/three/draco`.
- Legacy Hip copy is derived from the user's previously developed educational module; it is isolated and does not modify the deployed source.
- OpenSim Gait2392 knee trajectory excerpts: CC BY 3.0, Delp/Loan/Hoy/Zajac/Topp/Rosen/Thelen/Anderson/Seth. Source revision, coordinate changes, attribution and limits: `docs/ROLL_SLIDE_REVIEW.md`.
- SIMM spline algorithm ported from OpenSim/Common/SimmSpline.cpp, Peter Loan / Stanford University and Authors, Apache-2.0. License and notice: `vendor/opensim`.

Content is for teaching anatomical relationships. Movements/ligament tables are schematic, not clinical diagnosis, validated force estimation or quantitative tissue strain.

## ATLASCEND identity

ATLASCEND — Kinesiology (BETA). On the Shoulders of Giants. Beyond the Atlas.

巨人の肩に立ち、知の地図のその先へ。

The header and application icon use the user-provided, approved Kinesiology asset from the 2026-11-04 brand handover. The cube, orbital ring and knee symbol are preserved without regeneration. Brand artwork is separate from the third-party anatomy/model licenses above; no additional artwork license is inferred.
