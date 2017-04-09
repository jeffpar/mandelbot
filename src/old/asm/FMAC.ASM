        subttl  floating-point macros

	extrnl	$fset,$fres
	extrnl	$fadd,$qadd,$fsub,$qsub
	extrnl	$fmul,$qmul,$fdiv,$qdiv
	extrnl	$fneg,$ftru,$frnd,$fsgn,$fcmp,$qcmp
	extrnl	$fint,$fval,$fstr,$fread
	extrnb	fnbuf$


argf    macro   fp1,fp2
        ifdif   <fp1>,<di>
	if	((.type fp1) and 02h) eq 0 and ((.type fp1) and 20h) ne 0
	mov	di,fp1
	else
        mov     di,offset fp1
        endif
	endif
        ifdif   <fp2>,<si>
	if	((.type fp2) and 02h) eq 0 and ((.type fp2) and 20h) ne 0
	mov	si,fp2
	else
        mov     si,offset fp2
	endif
        endif
        endm

setf	macro	fp1,fp2
	argf	fp1,fp2
	call	$fset
	endm

result	macro	fp1
	argf	fp1,si
	call	$fres
	endm

addf	macro	fp1,fp2
	argf	fp1,fp2
	call	$fadd
	endm

addto	macro	fp1,fp2
	argf	fp1,fp2
	call	$qadd
	endm

subf	macro	fp1,fp2
	argf	fp1,fp2
	call	$fsub
	endm

subfrm	macro	fp1,fp2
	argf	fp1,fp2
	call	$qsub
	endm

multf	macro	fp1,fp2
	argf	fp1,fp2
	call	$fmul
	endm

multby	macro	fp1,fp2
	argf	fp1,fp2
	call	$qmul
	endm

divf	macro	fp1,fp2
	argf	fp1,fp2
	call	$fdiv
	endm

divby	macro	fp1,fp2
	argf	fp1,fp2
	call	$qdiv
	endm

negf	macro	fp1
	argf	fp1,si
	call	$fneg
	endm

trunc	macro	fp1
	argf	di,fp1
	call	$ftru
	endm

round	macro	fp1
	argf	di,fp1
	call	$frnd
	endm

signf	macro	fp1
	argf	di,fp1
	call	$fsgn
	endm

cmpf	macro	fp1,fp2
	argf	fp2,fp1
	call	$fcmp
	endm

cmpto	macro	fp1,fp2
	argf	fp2,fp1
	call	$qcmp
	endm

intf	macro	fp1,int
	argf	fp1,si
	ifdif	<int>,<ax>
	mov	ax,int
	endif
	call	$fint
	endm

valf	macro	fp1,str
	argf	fp1,str
	call	$fval
	endm

strf	macro	fp1,str
	ifb	<str>
	mov	di,offset fnbuf$
	argf	di,fp1
	else
	argf	str,fp1
	endif
	call	$fstr
	endm

readf	macro	prompt,fp1
	argf	fp1,prompt
	call	$fread
	endm

fpvar	macro   f1,f2,f3,f4,f5,f6,f7,f8
        irp     f,<f1,f2,f3,f4,f5,f6,f7,f8>
        ifnb    <f>            ;;declare up to 8 fp variables
f	dq	?
        endif
        endm
        endm

fpconst	macro   f1,f2,f3,f4,f5,f6,f7,f8
	ifnb	<f1>
f1	dq	f2	       ;;declare up to 4 initialized fp constants
	endif
	ifnb	<f3>
f3	dq	f4
	endif
	ifnb	<f5>
f5	dq	f6
	endif
	ifnb	<f7>
f7	dq	f8
	endif
        endm

        subttl
