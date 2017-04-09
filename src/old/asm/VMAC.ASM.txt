        subttl  video display macros

        extrnl	$vinit,$vexit,$vmode,$vclrs,$vsclv
        extrnl	$vwrts,$vwrtc,$vpos,$vcur,$vcolr,$vbox


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


screen	macro	mode
	ifdif	<mode>,<al>
	mov	al,mode
	endif
        call    $vmode
        endm

clear   macro   row,col,totrow,totcol
        ifdif   <row>,<al>
        mov     al,row
        endif
        ifdif   <col>,<ah>
        mov     ah,col
        endif
        ifdif   <totrow>,<bl>
        mov     bl,totrow
        endif
        ifdif   <totcol>,<bh>
        mov     bh,totcol
        endif
        call    $vclrs
        endm

scroll  macro   row,col,totrow,totcol,numrow
        ifdif   <row>,<al>
        mov     al,row
        endif
        ifdif   <col>,<ah>
        mov     ah,col
        endif
        ifdif   <totrow>,<bl>
        mov     bl,totrow
        endif
        ifdif   <totcol>,<bh>
        mov     bh,totcol
        endif
        ifdif   <numrow>,<cl>
        mov     cl,numrow
        endif
        call    $vsclv
        endm

disps   macro   var
        ifdif   <var>,<si>
        mov     si,offset var
        endif
        call    $vwrts
        endm

dispc   macro   c
        ifdif   <c>,<al>
        mov     al,c
        endif
        call    $vwrtc
        endm

locate  macro   row,col
        ifb     <row>
        mov     al,0FFh
        else
        ifdif   <row>,<al>
        mov     al,row
        endif
        ifdif   <col>,<ah>
        mov     ah,col
        endif
        endif
        call    $vpos
        endm

curtyp  macro   start,stop
        ifb     <start>
        mov     al,0FFh
        else
        ifdif   <stop>,<al>
        mov     al,stop
        endif
        ifdif   <start>,<ah>
        mov     ah,start
        endif
        endif
        call    $vcur
        endm

color   macro   fg,bg
        ifb     <fg>
        mov     al,0
        else
        ifb     <bg>
        ifdif   <fg>,<al>
        mov     al,fg
        endif
        else
        mov     al,fg+(bg)*16
        endif
        endif
        call    $vcolr
        endm

box     macro   row,col,totrow,totcol,boxtyp
        ifdif   <row>,<al>
        mov     al,row
        endif
        ifdif   <col>,<ah>
        mov     ah,col
        endif
        ifdif   <totrow>,<bl>
        mov     bl,totrow
        endif
        ifdif   <totcol>,<bh>
        mov     bh,totcol
        endif
        ifdif   <boxtyp>,<dl>
        mov     dl,boxtyp
        endif
        call    $vbox
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

plot	macro   row,col,clr    ;;BIOS graphics plot function
        ifdif   <row>,<dx>
        mov     dx,row
        endif
        ifdif   <col>,<cx>
        mov     cx,col
        endif
        ifdif   <clr>,<al>
        mov     al,clr
        endif
        mov     ah,12
        int     10h
        endm

        subttl
