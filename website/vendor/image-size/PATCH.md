This is `image-size@2.0.2` with a local security patch, published as `2.0.3` so scanners no longer match `<= 2.0.2`.

Upstream is archived and never shipped fixes for:

- CVE-2025-71329 / GHSA-5p2g-fcmc-qvqq — infinite loop on zero-size JXL/HEIF boxes
- CVE-2025-71330 / GHSA-w3rx-r6r6-pgpr — infinite loop on zero-length ICNS entries

The loops now `break` when a box or ICNS entry would not advance the offset.
