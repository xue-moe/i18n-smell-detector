# i18n-smell-detector report

## Summary

| Check | High | Medium | Low | Ignored |
|---|---:|---:|---:|---:|
| identical | 1 | 0 | 0 | 2 |
| hardcoded | 1 | 2 | 0 | 1 |
| placeholders | 0 | 0 | 0 | 0 |

## Identical translations

high=1 medium=0 low=0 ignored=2

| Level | Locale | Key | Value | Reason |
|---|---|---|---|---|
| high | zh | home.title | Welcome back | copied English phrase |

## Hardcoded strings

high=1 medium=2 low=0 ignored=1

| Level | Location | Value | Reason |
|---|---|---|---|
| high | src/components/UserPanel.vue:3:9 | Account settings | static template text |
| medium | src/components/UserPanel.vue:4:24 | Search | static placeholder attribute |
| medium | src/components/UserPanel.vue:5:13 | Save | static template text |

## Placeholder mismatches

high=0 medium=0 low=0 ignored=0

No placeholder mismatches found.

