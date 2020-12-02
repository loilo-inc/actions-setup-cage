# actions-setup-cage
Github Actions to setup [canarycage](https://github.com/loilo-inc/canarycage)

## Usage

```yml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
      - uses: loilo-inc/actions-setup-cage@{version}
```



## Cage Version

By default, if no `cage-version` specified in step parameters, the latest version of cage will be resolved and installed automatically. **This is highly recommended.**

If you need to set specified version of cage, add `cage-version` param.

```yaml
      - uses: loilo-inc/actions-setup-cage@{version}
        with:
          cage-version: 3.4.2
```
