# Hayase Extensions

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.1.0-orange.svg)](package.json)

Extensions for the Hayase app. These extensions add support for multiple torrent and NZB indexers.

## Installation

Copy the link below and import it into the Hayase app:

```
https://raw.githubusercontent.com/EffNine/hayase-extensions/main/index.json
```

## Available Extensions

| Extension | Type | Accuracy | Media | Status |
|-----------|------|----------|-------|--------|
| [Seadex](./seadex.js) | torrent | high | subtitles | Active |
| [AnimeTosho](./animetosho.js) | torrent | high | subtitles | Active |
| [AnimeTosho NZB](./animetosho-nzb.js) | nzb | high | subtitles | Active |
| [NyaaSi](./nyaasi.js) | torrent | medium | subtitles | Active |
| [NekoBT](./nekobt.js) | torrent | high | subtitles | Active |
| [NekoBT MultiSub](./nekobt-multi.js) | torrent | high | subtitles | Active |
| [ameNZB](./amenzb-nzb.js) | nzb | high | subtitles | Active |
| [SubsPlease](./subsplease.js) | torrent | high | subtitles | Active |
| [AniRena](./anirena.js) | torrent | medium | subtitles | Active |
| [Sukebei](./sukebei.js) | torrent | medium | both | Active |

## Development

```bash
# Install dependencies
npm install

# Run auto-commit tool
npm run auto-commit
```

## Contributing

Contributions are welcome! Please ensure:
- Extensions follow the Hayase manifest v2 format
- Code is clean and well-documented
- Tests pass before submitting

## License

[MIT](LICENSE)
