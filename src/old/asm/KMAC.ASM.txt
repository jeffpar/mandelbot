        subttl  keyboard macros

	extrnl	$input,$inpck,$inpcl,$inpwt,$yesp,$yesno,$line
	extrnb	lnbuf$


tab     equ     9
cr      equ     13
lf      equ     10
esc     equ     27
f1      equ     59
f2      equ     60
f3      equ     61
f4      equ     62
f5      equ     63
f6      equ     64
f7      equ     65
f8      equ     66
f9      equ     67
f10     equ     68
up      equ     72
down    equ     80
left    equ     75
right   equ     77
home    equ     71
endln   equ     79
pgup    equ     73
pgdn    equ     81
ins     equ     82
del     equ     83
ctrl    equ     96              ;subtract from lower case for ctrl chars


read	macro
	call	$input		;return character in ax
	endm

chkbd	macro
	call	$inpck		;check on input
	endm

readc	macro
	call	$inpcl		;read after clearing input
	endm

wait	macro
	call	$inpwt		;display wait message & wait for input
	endm

yesno	macro	prompt
	ifnb	<prompt>
	ifdif	<prompt>,<si>
	mov	si,offset prompt
	endif
	call	$yesp		;prints prompt, then waits
	else
	call	$yesno		;al is char, carry is answer
	endif
	endm

readln	macro   buf
	ifb	<buf>
	mov	si,offset lnbuf$
	else
        ifdif   <buf>,<si>
        mov     si,offset buf
        endif
	endif
        call    $line		;read a line of buffered input
        endm

        subttl
