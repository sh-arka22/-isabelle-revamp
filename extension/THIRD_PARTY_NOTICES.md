# Isabelle source reference

The minimal LanguageClient startup in `src/extension.ts` is adapted from
`Isabelle2025-2.app/src/Tools/VSCode/extension/src/extension.ts`, lines 97–128
(authors: Makarius, Denis Paluca, Fabian Huch). It retains the stdio server launch
and file/language document selector, using the current LanguageClient API.
The grammar is written here for the requested core Isar subset.

`src/symbolCodes.json` contains the 439 `code:` assignments from
`Isabelle2025-2.app/etc/symbols`, with the `\<…>` wrapper removed from each key
and each hexadecimal code converted to its Unicode character. No assignments
were invented. `src/symbols.ts` interprets the single-character sub/superscript
controls for characters with Unicode equivalents; unsupported controls and
custom symbol names are preserved. The control meanings were checked against
`src/Pure/General/html.scala:154–179` and live server output. The license below
also covers the copied symbol data.

The distribution copyright notice is reproduced below. No Isabelle source files
were modified.

```text
ISABELLE COPYRIGHT NOTICE, LICENCE AND DISCLAIMER.

Copyright (c) 1986-2026,
  University of Cambridge,
  Technische Universitaet Muenchen,
  and contributors.

  All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

* Redistributions of source code must retain the above copyright
notice, this list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright
notice, this list of conditions and the following disclaimer in the
documentation and/or other materials provided with the distribution.

* Neither the name of the University of Cambridge or the Technische
Universitaet Muenchen nor the names of their contributors may be used
to endorse or promote products derived from this software without
specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

```

# Decorations, palette and outline

`src/palette.ts` carries the `isabelle.text_color` defaults of the official
Isabelle2025-2 VS Code extension (`src/Tools/VSCode/extension/package.json`,
covered by the Isabelle licence above), in the `[light, dark]` table layout of
`colors.ts` from yfprojects' `vscode-isabelle` (BSD-3-Clause, copyright (c) 2026
yfprojects and collaborators). The upstream `keyword3_dark` value is corrected.
`src/decorations.ts` renders each `PIDE/decoration` prefix (background, dotted
underline, text colour, overview ruler lane) the way the official
`src/Tools/VSCode/extension/src/decorations.ts` (author Makarius) does; the
code is ours. The outline's design (commands at the start of a line outside
comments, strings and cartouches; headings nest; `begin … end` blocks contain;
items fold to the next item) follows yfprojects' `outline.ts`; `src/outlineModel.ts`
is written on top of this project's own `isarTokens` lexer.

```text
BSD 3-Clause License

Copyright (c) 2026, yfprojects (github.com user) and collaborators
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```
