# XSD-navigator

## AKA I just want to browse the schema

There are a number of over-engineered tools that display an XML schema (XSD) in a way that makes sense, but most of them are huge (Visual $tudio) or way more functionality than needed to just browse.  It occured to me that DOM parsing is a lot like looking through a schema definition, so why not try that?

### Feature TODOs

- Display more information about nodes, including types, required, local info, documentation
- Find larger schemas to parse
- Allow multiple import of other schemas required to understand or define
- for enumerated leaves, display values
- for simpletype leaves, display value info (if found)
- modify color scheme
- horizontal scroll and display, use entire screen for display
- type search, highlight, and number where present in subtree (get a picture of type reuse)
- add a license