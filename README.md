# XSD-navigator

## AKA I just want to browse the schema

There are a number of over-engineered tools that display an XML schema (XSD) in a way that makes sense, but most of them are huge (Visual $tudio) or way more functionality than needed to just browse.  It occured to me that DOM parsing is a lot like looking through a schema definition, so why not try that?

### Feature TODOs

- Optionally display documentation
- Find larger schemas to parse
- Allow multiple import of other schemas required to understand or define
- for enumerated leaves, display values
- for simpletype leaves, display value info (if found)
- modify color scheme
- type search, highlight, and number where present in subtree (get a picture of type reuse)
- add a license

### Fixes/Bugs

Problem: New pages do not overlap page 0 initially, but overlap each other so much that the underlying text is not visible

Solution: New pages from the next level of elements should appear offset to the right just enough that the text of every element of the previous level is visible

Problem: (Bug) Page location shifts to the right even when no underlying pages are still open.  

Solution: Probably mismanaged state, collapse all button resets this

Problem: Pages from the same level of elements display to the right when opened, potentially confusing the user into thinking that an element is not of the correct layer

Solution: If multiple pages at same level are opened, underlying page must grow vertically to allow underlying remaining elements to still be seen