        subttl  rom-bios function macros

black   equ     0               ;use these colors for
blue    equ     1               ;the fg and bg COLOR arguments
green   equ     2
cyan    equ     3               ;when no bg is given
red     equ     4               ;background color will be black (0)
magenta equ     5
brown   equ     6		;for monochrome fg, green to white is white
white   equ     7		;for monochrome bg, black to brown is black

undline equ     1               ;for monochrome fg only (not valid on a CGA)

light   equ     8		;add to any foreground color
reverse equ     16		;multiply to convert foreground to background

gray	equ	light+black
yellow	equ	light+brown


kbread  macro                  ;;BIOS keyboard read routine
        mov     ah,0           ;;Checks: none  Sets: AX
        int     16h             ;get next key, scan code in AH, ascii in AL
        endm

kbchck  macro                  ;;BIOS keyboard test routine
        mov     ah,1           ;;Checks: none  Sets: AX
        int     16h             ;check next key without reading it
        endm

kbshft  macro                  ;;BIOS keyboard shift test routine
        mov     ah,2           ;;Checks: none  Sets: AX
        int     16h             ;get status byte for keyboard shift keys
        endm

kbclr   macro                  ;;BIOS keyboard clear routine
        local   c1,c2          ;;Checks: none  Sets: AX
c1:     kbchck
        jz      c2              ;jump if no input available
        kbread
        jmp     c1              ;loop until all buffered keys are removed
c2:
        endm

vdread  macro   pge            ;;BIOS read character call
        ifdif   <pge>,<bh>     ;;Checks: BH  Sets: AX,BH,BP
        mov     bh,pge          ;define the page we're talking about
        endif
        mov     ah,8            ;video read function #
        int     10h             ;get char/attribute in AL/AH at cursor
        endm

vdwrit  macro   c,att,pge,tot  ;;BIOS write character call
        ifdif   <c>,<al>       ;;Checks: AL,BX,CX  Sets: AX,BX,CX,BP
        mov     al,c            ;set the char
        endif
        ifdif   <att>,<bl>
        mov     bl,att          ;set the attribute
        endif
        ifdif   <pge>,<bh>
        mov     bh,pge          ;set the page
        endif
        ifdif   <tot>,<cx>
        mov     cx,tot          ;set total times
        endif
        mov     ah,9            ;video write function #
        int     10h
        endm

vddisp  macro   c,att          ;;BIOS ascii display routine
        ifdif   <c>,<al>       ;;Checks: AL,BL  Sets: AX,BL,BP
        mov     al,c            ;set the char
        endif
        ifdif   <att>,<bl>
        mov     bl,att          ;set the attribute
        endif
        mov     ah,14           ;video display function #
        int     10h
        endm

getvst  macro                  ;;BIOS video state call
        mov     ah,15          ;;Checks: none  Sets: AX,BH,BP
        int     10h             ;mode->AL, width->AH, active page->BH
        endm

getcst  macro   page           ;;BIOS cursor state call
        ifdif   <page>,<bh>    ;;Checks: BH  Sets: AX,BH,CX,DX,BP
        mov     bh,page         ;select the page
        endif
        mov     ah,3            ;CH/CL get top/bottom cursor scan lines
        int     10h             ;DH/DL get row/column of cursor position
        endm

setmde  macro   mode           ;;BIOS set video mode call
        ifdif   <mode>,<al>    ;;Checks: AL  Sets: AX,BP
        mov     al,mode         ;set video mode (0-7)
        endif
        mov     ah,0            ;select video mode function
        int     10h
        endm

setpge  macro   page           ;;BIOS set video page call
        ifdif   <page>,<bh>    ;;Checks: BH  Sets: AX,BH,BP
        mov     bh,page         ;set desired page
        endif
        ifdif   <page>,<al>
        mov     al,bh           ;BIOS requires page from AL
        endif
        mov     ah,5            ;select video page select function
        int     10h
        endm

setcps  macro   row,col,page   ;;BIOS set cursor position call
        ifdif   <page>,<bh>    ;;Checks: BH,DX  Sets: AX,BH,DX,BP
        mov     bh,page         ;select the proper page
        endif
        ifdif   <row>,<dh>
        mov     dh,row          ;DH/DL must contain row/column
        endif
        ifdif   <col>,<dl>
        mov     dl,col
        endif
        mov     ah,2            ;select set cursor function
        int     10h
        endm

setctp  macro   ts,bs          ;;BIOS set cursor size call
        ifdif   <ts>,<ch>      ;;Checks: CX  Sets: AX,CX,BP
        mov     ch,ts           ;CH/CL must contain top/bottom scan lines
        endif
        ifdif   <bs>,<cl>
        mov     cl,bs
        endif
        mov     ah,1            ;select set cursor type function
        int     10h
        endm

setclr  macro   clr            ;;BIOS set background color
        ifdif   <clr>,<bl>     ;;Checks: BL  Sets: AX,BX,BP
        mov     bl,clr          ;set color code
        endif
        mov     bh,0
        mov     ah,11           ;select color function
        int     10h
        endm

setplt  macro   plt            ;;BIOS set palette color
        ifdif   <plt>,<bl>     ;;Checks: BL  Sets: AX,BX,BP
        mov     bl,plt          ;set color code
        endif
        mov     bh,1
        mov     ah,11           ;select color function
        int     10h
        endm

eqpchk  macro                  ;;BIOS equipment check
        int     11h             ;AX gets equipment bit flags
        endm

memsiz  macro                  ;;BIOS memory-size determination
        int     12h             ;AX gets #K bytes in system
        endm

reboot  macro                  ;;BIOS bootstrap loader function
        int     19h             ;reload boot from disk
        endm

        subttl
