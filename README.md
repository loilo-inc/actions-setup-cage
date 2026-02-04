# actions-setup-cage

Github Actions to setup [canarycage](https://github.com/loilo-inc/canarycage)

## Usage

`github-token` is required.

```yml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
      - uses: loilo-inc/actions-setup-cage@{version}
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Cage Version

By default, if no `cage-version` specified in step parameters, the latest version of cage will be resolved and installed automatically. **This is highly recommended.**

If you need to set specified version of cage, add `cage-version` param.

```yaml
- uses: loilo-inc/actions-setup-cage@{version}
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    cage-version: 3.4.2
```

## Use Prerelease version

If you want to use prerelease (RC) version of cage, add `use-pre` param.

```yaml
- uses: loilo-inc/actions-setup-cage@{version}
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    use-pre: true
```
