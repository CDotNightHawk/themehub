" Paw colorscheme
hi clear
if exists("syntax_on") | syntax reset | endif
let g:colors_name = "paw"

hi Normal       guibg=#1a1720 guifg=#f5e9f5
hi CursorLine   guibg=#201c28
hi LineNr       guifg=#5b4d66
hi CursorLineNr guifg=#ff4fb2
hi Visual       guibg=#3a2f46
hi Comment      guifg=#6e5e78 gui=italic
hi Statement    guifg=#ff4fb2
hi Function     guifg=#c792ea
hi String       guifg=#8aff7a
hi Number       guifg=#ffcb6b
hi Type         guifg=#82aaff
hi Identifier   guifg=#e5b5ff
hi PreProc      guifg=#89ddff
hi Special      guifg=#ff9caf
hi Error        guifg=#ff6b8a guibg=NONE
hi StatusLine   guibg=#2a2530 guifg=#ff4fb2
hi Search       guibg=#b24dff guifg=#1a1720
