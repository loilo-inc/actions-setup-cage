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

### If status 403?

It may be [Rate limiting](https://docs.github.com/en/rest/overview/resources-in-the-rest-api?apiVersion=2022-11-28#rate-limiting) by GitHub REST API

Use of `GITHUB_TOKEN` is recommended.

```yml
      - uses: loilo-inc/actions-setup-cage@{version}
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```