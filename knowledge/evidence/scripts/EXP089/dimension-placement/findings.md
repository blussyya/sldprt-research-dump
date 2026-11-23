# Dimension-placement survey (in progress)

The feature reader currently reaches `moFavoriteHandle_c` by scanning over an opaque placement
record inside displayed dimensions. This survey captures those ranges with their owning display,
handle, dimension and feature classes.

It finds 100 placement records in 51 controlled and production files, totalling 51,738 bytes,
with no feature-reader error in the surveyed files. The records have 13 observed lengths from 308
to 587 bytes. They are not arbitrary lengths: each length follows the display/handle/dimension
family, with a few additional production variants.

Most matched SW2011/SW2022 controlled records differ by two bytes in total:

| SW2011 | SW2022 | common use |
|---:|---:|---|
| 585 | 587 | feature distance or depth |
| 539 | 541 | feature radius or angle |
| 513 | 515 | shorter distance form |
| 336 | 338 | sketch distance/revolve form |

The first differing byte is normally byte 3. For example, C00 starts `00 00 00 13` in SW2011 and
`00 00 00 1b` in SW2022. That byte varies further in the gear and appears to be an ID or variant,
not a byte count. The two-byte total difference therefore does not by itself give a field boundary.

This is a map for the next decoder, not a decoded layout. The forward scan remains in the research
reader until a bounded parser survives truncation and every observed family.
