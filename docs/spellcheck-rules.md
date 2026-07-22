# Spellcheck Rule Notes

The built-in checker is intentionally rule based. It does not try to be a full Korean grammar checker. It generates candidates that preserve block offsets so edits can be applied back into the original log HTML.

## Typo Candidate Rules

Current typo rules cover common patterns such as:

- `됬/됀/됄/됍` -> `됐/된/될/됩`
- `되요/되서/되야/되도` -> `돼요/돼서/돼야/돼도`
- `뵈요/뵈어/뵈었` -> `봬요/봬/뵀`
- `할께/갈께/볼께/줄께/올께` -> `할게/갈게/볼게/줄게/올게`
- `할껄/갈껄/볼껄/줄껄` -> `할걸/갈걸/볼걸/줄걸`
- `어떻해/어떻하지/어떻하` -> `어떡해/어떡하지/어떡하`
- `맛춤/몇일/웬지/왠만/왠일/왠걸/금새/요세/구지/오랫만`
- `역활/희안/설겆/설레임/깨끗히/틈틈히/곰곰히/일일히/번번히`
- `가르키/가르켜/무릎쓰/통채/닥달/뒤치닥/널부러/나즈막`
- `바램/뇌졸증/삼가해`

## Spacing Candidate Rules

Current spacing rules cover common bound noun and auxiliary patterns such as:

- `~텐데` -> `~ 텐데`
- `~테니까` -> `~ 테니까`
- `~수있다` -> `~ 수 있다`
- `~수없다` -> `~ 수 없다`
- `~수밖에` -> `~ 수밖에`
- `~줄알다` -> `~ 줄 알다`
- `~줄모르다` -> `~ 줄 모르다`
- `~것같다` -> `~ 것 같다`
- `~거같다` -> `~ 거 같다`
- `~듯하다`, `~듯싶다`
- `~척하다`
- `~만하다`
- `~법하다`
- `~뻔하다`
- `~뿐이다`, `~뿐만`, `~뿐이라`

## Tuning Rule

Only add rules that are useful as review candidates. A rule does not need to be perfect, but it should not create so many false positives that reviewing logs becomes slower.
