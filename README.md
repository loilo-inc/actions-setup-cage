# actions-setup-cage
Github Actions to setup [canarycage](https://github.com/loilo-inc/canarycage)

# Usage

```yml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
      - uses: loilo-inc/actions-setup-cage@v1.0.0
```
