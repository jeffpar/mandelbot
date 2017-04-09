        subttl  string macros

	extrnl	$print,$scan,$size,$scopy,$dval,$dstr,$ucase,$chksw
	extrnb	dnbuf$


args    macro   a1,a2
        ifdif   <a1>,<si>
	if	((.type a1) and 02h) eq 0 and ((.type a1) and 20h) ne 0
	mov	si,a1
	else
        mov     si,offset a1
        endif
	endif
        ifdif   <a2>,<di>
	if	((.type a2) and 02h) eq 0 and ((.type a2) and 20h) ne 0
	mov	di,a2
	else
        mov     di,offset a2
	endif
        endif
        endm

print   macro   str
	args	str,di
	call	$print		;print string addressed by [si]
        endm

scan	macro	str,ch
	args	str,di
	ifdif	<ch>,al
	mov	al,ch
	endif
	call	$scan		;scan string at [si] for character in al
	endm

size	macro	str
	args	str,di
	call	$size		;returns size of string at [si] in cx
	endm

scopy	macro	src,dst,max
	args	src,dst
	ifb	<max>
	sub	cx,cx
	else
	ifdif	<max>,<cx>
	mov	cx,max
	endif
	endif
	call	$scopy		;copy string from [si] to [di]
	endm

vald	macro	str
	args	str,di
	call	$dval		;get decimal value in ax of string at [si]
	endm

strd	macro	num,str
	ifb	<str>
	mov	di,offset dnbuf$
	else
	args	si,str
	endif
	ifdif	<num>,<ax>
	mov	ax,num
	endif
	call	$dstr		;convert ax to decimal string at [di]
	endm

ucase   macro   c
        ifdif   <c>,<al>
        mov     al,c
        endif
        call    $ucase		;convert al to upper-case
        endm

chksw   macro   c
        ifdif   <c>,<al>
        mov     al,c
        endif
        call    $chksw		;check command line for switch in al
        endm

        subttl
