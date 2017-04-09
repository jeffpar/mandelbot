        subttl  assembler directive macros

	page	60,132
	.sfcond			;suppress unassembled blocks


true    equ     0FFFFh
false   equ     0
k       equ     1024
bit0    equ     1
bit1    equ     2
bit2    equ     4
bit3    equ     8
bit4    equ     16
bit5    equ     32
bit6    equ     64
bit7    equ     128

exe$$   equ     false           ;assemble modules for .com file


extrnl  macro   s1,s2,s3,s4,s5,s6,s7,s8
        irp     s,<s1,s2,s3,s4,s5,s6,s7,s8>
        ifnb    <s>            ;;declare up to 8 external labels
        if      exe$$
        extrn   s:far
        else
        extrn   s:near
        endif
        endif
        endm
        endm

extrnc  macro   s1,s2,s3,s4,s5,s6,s7,s8
        irp     s,<s1,s2,s3,s4,s5,s6,s7,s8>
        ifnb    <s>            ;;declare up to 8 external constants
        extrn   s:abs
        endif
        endm
        endm

extrnb  macro   s1,s2,s3,s4,s5,s6,s7,s8
        irp     s,<s1,s2,s3,s4,s5,s6,s7,s8>
        ifnb    <s>            ;;declare up to 8 external bytes
        extrn   s:byte
        endif
        endm
        endm

extrnw  macro   s1,s2,s3,s4,s5,s6,s7,s8
        irp     s,<s1,s2,s3,s4,s5,s6,s7,s8>
        ifnb    <s>            ;;declare up to 8 external words
        extrn   s:word
        endif
        endm
        endm

dbvar	macro   d1,d2,d3,d4,d5,d6,d7,d8
        irp     d,<d1,d2,d3,d4,d5,d6,d7,d8>
        ifnb    <d>            ;;declare up to 8 byte variables
d	db	?
        endif
        endm
        endm

dbconst	macro   d1,d2,d3,d4,d5,d6,d7,d8
	ifnb	<d1>
d1	db	d2	       ;;declare up to 4 initialized byte constants
	endif
	ifnb	<d3>
d3	db	d4
	endif
	ifnb	<d5>
d5	db	d6
	endif
	ifnb	<d7>
d7	db	d8
	endif
        endm

dwvar	macro   d1,d2,d3,d4,d5,d6,d7,d8
        irp     d,<d1,d2,d3,d4,d5,d6,d7,d8>
        ifnb    <d>            ;;declare up to 8 word variables
d	dw	?
        endif
        endm
        endm

dwconst	macro   d1,d2,d3,d4,d5,d6,d7,d8
	ifnb	<d1>
d1	dw	d2	       ;;declare up to 4 initialized word constants
	endif
	ifnb	<d3>
d3	dw	d4
	endif
	ifnb	<d5>
d5	dw	d6
	endif
	ifnb	<d7>
d7	dw	d8
	endif
        endm

cproc   macro   lbl,typ        ;;define procedure and type
        far$$=exe$$
        ifidn   <typ>,<far>
        far$$=true
        endif
        ifidn   <typ>,<near>
        far$$=false
        endif
        if      far$$
lbl     label   far
        else
lbl     label   near
        endif
        endm

eproc   macro   lbl,typ        ;;close procedure
        local   p1
        ifidn   <typ>,<i>
        iret
        else
	ifidn	<typ>,<far>
p1	proc	far
	ret
p1	endp
	else
	ifidn	<typ>,<near>
p1	proc	near
	ret
p1	endp
	else
        if      far$$
p1      proc    far
        ret     typ
p1      endp
        else
p1      proc    near
        ret     typ
p1      endp
        endif
        endif
        endif
        endif
        endm

popflgs macro
        local   p1,p2
        jmp     short p2       ;;IBM's work-around for POPF
p1:     iret                   ;;instruction, which could allow
p2:     push    cs             ;;pending interrupts to occur on an 80286
        call    p1
        endm

cgroup  macro   s1,s2,s3,s4    ;;conditional grouping mechanism
        if      exe$$
origin	equ	0000h
	assume	cs:s1,ds:s1,es:nothing,ss:cseg
	else
origin  equ     0100h
        ifb     <s2>
cgrp    group   s1
        else
        ifb     <s3>
cgrp    group   s1,s2
        else
        ifb     <s4>
cgrp    group   s1,s2,s3
        else
cgrp    group   s1,s2,s3,s4
        endif
        endif
        endif
        assume  cs:cgrp,ds:cgrp,es:cgrp,ss:cgrp
        endif
        endm

defseg  macro   seg1,seg2,seg3,seg4
	ifidn	<seg1>,<cseg>
seg1	segment	word public 'code'
	cgroup	seg1,seg2,seg3,seg4
	else
	ifb	<seg2>
seg1	segment para public '&seg1'
	else
	ifidn	<seg2>,<stack>
	if	exe$$
seg1	segment para stack '&seg2'
	else
seg1	segment	para public '&seg2'
	endif
	else
	ifidn	<seg1>,<seg2>
	ifb	<seg3>
seg1	segment	para public '&seg1'
seg1	ends
	else
seg1	segment para public '&seg3'
seg1	ends
	endif
	else
seg1	segment	para public '&seg2'
	endif
	endif
	endif
        assume  cs:seg1,ds:seg1,es:nothing,ss:cseg
	endif
        endm

endseg  macro   seg1
seg1    ends
        endm

dosf    macro   fn             ;;DOS function call
        ifdif   <fn>,<ah>      ;;Checks: AH  Sets: ???
        mov     ah,fn           ;DOS function #
        endif
        int     21h             ;call DOS function service
        endm

write	macro	var	       ;;DOS 'write char' function
	ifdif	<var>,<dl>     ;;Checks: DL  Sets: AH,DL
	mov	dl,var
	endif
	dosf	02h
	endm

writes	macro   var            ;;DOS 'write string' function
        ifdif   <var>,<dx>     ;;Checks: DX  Sets: AH,DX
        mov     dx,offset var   ;address of DOS string to write
        endif
        dosf    09h
        endm

setvec  macro   typ,lbl        ;;DOS 'set vector' function
        ifdif   <typ>,<al>     ;;Checks: AL,DX,DS  Sets: AX,DX  Opts: lbl
        mov     al,typ         ;;Checks: BX,ES also, whenever no lbl given
        endif
        ifnb    <lbl>
        mov     dx,offset lbl   ;address to store in vector
        else
        mov     dx,bx           ;copy ES:BX to DS:DX since no lbl
        push    ds              ;but preserve DS (our default data segment)
        push    es
        pop     ds
        endif
        dosf    25h
        ifb     <lbl>
        pop     ds              ;restore default data segment
        endif
        endm

getvec  macro   typ,lbl        ;;DOS 'get vector' function
        ifdif   <typ>,<al>     ;;Checks: AL  Sets: AX,BX,ES  Opts: lbl
        mov     al,typ          ;set vector no.
        endif
        dosf    35h
        ifnb    <lbl>
        mov     lbl,bx          ;store 32-bit vector address at given lbl
        mov     lbl+2,es
        endif
        endm

exit    macro   lvl,top        ;;DOS 'terminate process' function
        ifdif   <lvl>,<al>     ;;Checks: AL,DX  Sets: AX,DX  Opts: top
        mov     al,lvl          ;set program exit code
        endif
        ifb     <top>          ;;if no top address
        dosf    4Ch            ;;select simple terminate
        else
        cld                     ;error in dos 2.1???
        mov     dx,top          ;this is assumed to be total paragraphs
        dosf    31h
        endif
        endm

        subttl
