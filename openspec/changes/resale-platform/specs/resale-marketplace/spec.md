## MODIFIED Requirements

### Requirement: Feed API Filter Support

`GET /resale/listings` SHALL hỗ trợ thêm các optional query params: `search` (string, tìm theo concert title), `priceMin` (number), `priceMax` (number). Tất cả params hiện có giữ nguyên, backward compatible.

#### Scenario: Search by concert name

- **WHEN** request có `search=anh trai`
- **THEN** chỉ trả listings thuộc concerts có `title ILIKE '%anh trai%'`

#### Scenario: Price range filter

- **WHEN** request có `priceMin=500000&priceMax=1000000`
- **THEN** chỉ trả listings có `askingPriceVnd` trong khoảng đó

### Requirement: Feed Response Concert Context

Mỗi item trong feed response SHALL bao gồm: `concertTitle` (string), `concertSlug` (string), `concertStartsAt` (ISO datetime).

#### Scenario: Feed item includes concert fields

- **WHEN** `GET /resale/listings` trả kết quả
- **THEN** mỗi item có `concertTitle`, `concertSlug`, `concertStartsAt` populated từ JOIN với bảng `concerts`
