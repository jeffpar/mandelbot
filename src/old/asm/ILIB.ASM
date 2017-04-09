	title	interrupt routines


	include	dmac.asm	;macros

	public	$igrab,$iexit,$idos,$ifree
	public	kbmsk$

maxwait	equ	3		;# of kbd status calls


	defseg	cseg

	include	vmac.asm	;video externals
	include	smac.asm	;string externals
	include	mmac.asm	;memory module externals

	cproc	$igrab,near
	or	byte ptr intflg,1
	chksw	's'		;'show' switch?
	jb	ig1
	and	byte ptr intflg,not 2
ig1:	chksw	'c'		;disable on Ctrl, too?
	jb	ig8
	or	byte ptr kbmsk$,04h
ig8:	getvec	10h,vidjmp	;save video address
	getvec	16h,keyjmp	;save key service address
	getvec	21h,dosjmp	;save dos function address
	getvec	28h,ds2jmp	;save 2nd dos vector address
	push	ds
	pop	es		;getvec calls altered es
	setvec	23h,ig9
	setvec	10h,vidrtn
	setvec	16h,keyrtn
	setvec	21h,dosrtn
	setvec	28h,ds2rtn	;set up our own routines to handle these
	eproc	$igrab
ig9:	call	free
	mov	al,1
	call	$vexit

	cproc	$ifree,near	;must first set up a routine to attempt
	test	byte ptr intflg,1
	jz	if9		;an unload when DOS ready, then free vectors
	pop	nxtadr
	push	ax
	push	bx
	push	cx
	push	bp		;issue three bells
	mov	cx,3		;to indicate processing done
if0:	mov	ax,7+14*256
	int	10h
	loop	if0
	pop	bp
	pop	cx
	pop	bx
	pop	ax		;and don't show anything more
	and	byte ptr intflg,not 2
if1:	call	$idos
	call	$unload
	jb	if1
	call	free
if9:	eproc	$ifree

	cproc	free,near
	les	bx,dword ptr vidjmp
	setvec	10h
	les	bx,dword ptr keyjmp
	setvec	16h
	les	bx,dword ptr dosjmp
	setvec	21h
	les	bx,dword ptr ds2jmp
	setvec	28h		;vectors restored, we won't be coming back
	and	byte ptr intflg,not 1
	eproc	free

	cproc	$idos,near	;releases control until DOS available
	or	byte ptr dbusy$,2

	cproc	$iexit,near	;releases control until we can have it again
	test	byte ptr intflg,1
	jz	ie9
	cmp	word ptr nxtadr,0
	jne	ie8
	pop	nxtadr
	mov	sp,offset end$+256
	mov	regs+16,sp
	mov	regs+18,ss
	call	swpreg
	mov	dx,sp
	int	27h		;exit program
ie8:	pop	nxtadr
ie9:	eproc	$iexit

	cproc	vidrtn,far	;video service routine
	mov	byte ptr cs:wait,maxwait
	jmp	dword ptr cs:vidjmp

	cproc	keyrtn,far	;keyboard service routine
	pushf
	sti
	or	ah,ah		;try to determine
	jnz	ky2		;when non-nested calls done
	test	byte ptr cs:dbusy$,128
	jz	ky1
	and	byte ptr cs:dbusy$,not (1+128)
ky1:	mov	ah,1		;if they're doing straight input
	pushf			;then we'll see if there is anything
	cli
	call	dword ptr cs:keyjmp
	jnz	ky8		;if there is, we let the call continue
	call	kcall
	jmp	ky1
ky2:	cmp	ah,1
	jne	ky9		;pass any other call through
	cli
	call	dword ptr cs:keyjmp
	jz	ky2a		;let valid kbd status call through
	eproc	keyrtn,2
ky2a:	cli
	pushf
	sti
	mov	ah,1		;restore function #
	cmp	byte ptr cs:wait,0
	jne	ky3
	call	kcall
	jmp	short ky9	;then allow call to pass through
ky3:	dec	byte ptr cs:wait
	jmp	short ky9
ky8:	mov	ah,0		;restore straight input call function #
ky9:	popf
	jmp	dword ptr cs:keyjmp

	cproc	dosrtn,far	;dos function service routine
	pushf
	sti
	push	ds
	push	cs
	pop	ds
	test	byte ptr dbusy$,16
	jnz	df0a		;if this isn't one of our calls
;	test	byte ptr dbusy$,4
;	jz	dfa		;no distinguishing between ctrl-break?
;	test	byte ptr dbusy$,32
;	jnz	dfa		;and int 28 is not in progress...
;	jmp	df10		;then we'll forget that this ever happened
dfa:	or	byte ptr dbusy$,64
	cmp	ah,0Ch
	ja	df0
	and	byte ptr dbusy$,not (1+4+8)
df0:	mov	byte ptr wait,maxwait
df0a:	test	byte ptr dbusy$,1
	jz	df1
	test	byte ptr dbusy$,4
	jz	df1
	or	byte ptr dbusy$,8
	jmp	short df1a
df1:	mov	byte ptr dfunc$,ah
df1a:	and	byte ptr dbusy$,not 1
	call	dcall		;see if there's something to do
	or	byte ptr dbusy$,1
	or	ah,ah
	jz	df9		;non-nested call
	cmp	ah,byte ptr dfntbl+1
	jb	df8		;do well-nested call
	cmp	ah,58h
	jb	df2		;check against our table
	cmp	ah,63h
	jb	df9		;records what kind of call in progress
	or	byte ptr dbusy$,128
	jmp	short df9
df2:	push	di
	push	es
	push	cs
	pop	es
	push	ax
	push	cx
	mov	di,offset dfntbl
	mov	cx,dfnend-dfntbl
	mov	al,ah
	cld
	repne	scasb		;repeat while not equal (and cx <> 0)
	pop	cx
	pop	ax
	pop	es
	jne	df7		;must be well-nested call
	cmp	di,offset dfntbl+6
	pop	di
	ja	df9
	or	byte ptr dbusy$,128
	jmp	short df9
df7:	pop	di
df8:	pop	ds
	or	byte ptr cs:dbusy$,4
	popf
	pushf			;perform well-nested call, then clear busy
	call	dword ptr cs:dosjmp
	pushf
	and	byte ptr cs:dbusy$,not (1+4+128)
	test	byte ptr cs:dbusy$,8
	jz	df8a
	or	byte ptr cs:dbusy$,1+4
	and	byte ptr cs:dbusy$,not 8
df8a:	popf
	eproc	dosrtn,2	;return flags as changed
df9:	and	byte ptr dbusy$,not 8
df10:	pop	ds
	popf			;go here for non-nested calls, busy stays on
	jmp	dword ptr cs:dosjmp

	cproc	ds2rtn,far
	pushf
	or	byte ptr cs:dbusy$,32
	and	byte ptr cs:dbusy$,not 64
	popf
	pushf
	call	dword ptr cs:ds2jmp
	pushf
	sti
	push	ds
	push	cs
	pop	ds
	and	byte ptr dbusy$,not (32+64)
	cmp	byte ptr dfunc$,0
	je	ds9
	cmp	byte ptr dfunc$,0Ch
	ja	ds9
	call	dcall
ds9:	pop	ds
	popf
	eproc	ds2rtn,i

	cproc	kcall,near
	push	ds
	mov	ds,cs:bseg	;bios segment (40h)
	push	ax
	mov	al,cs:kbmsk$
	test	ds:[17h],al
	pop	ax
	jnz	kc9		;shift key active
	push	cs
	pop	ds
	test	byte ptr dbusy$,2
	jz	kc1
	test	byte ptr dbusy$,1
	jz	kc0		;dcall can handle this now
	test	byte ptr dbusy$,32
	jz	kc9		;if int 28h active
	test	byte ptr dbusy$,64
	jz	kc9		;and another call flagged, do it
kc0:	call	dcall
	pop	ds
	eproc	kcall
kc1:	call	dc1		;quicker method only if dos not needed
kc9:	pop	ds
	eproc	kcall

	cproc	dcall,near
	test	byte ptr dbusy$,2
	jz	dc0a		;no dos request pending
	and	byte ptr dbusy$,not 2
	push	ax
	push	dx
	mov	al,0		;get ctrl-break state
	dosf	33h
	mov	savbrk,dl
	mov	al,1
	mov	dl,0		;set it off for now
	dosf	33h
	pop	dx
	push	bx
	push	es
	dosf	2Fh		;get current dta
	mov	savdta,bx
	mov	savdta+2,es
	pop	es
	pop	bx
	push	dx
	mov	dx,80h		;set our correct dta
	dosf	1Ah
	pop	dx
	pop	ax
	call	dc1		;do our dos stuff now
	push	ax
	mov	al,dbusy$
	push	ax
	and	byte ptr dbusy$,not 2
	push	dx
	push	ds
	lds	dx,dword ptr savdta
	dosf	1Ah
	pop	ds
	mov	al,1
	mov	dl,savbrk
	dosf	33h		;set ctrl-break state back
	pop	dx
	pop	ax
	test	al,2
	jz	dc0
	or	byte ptr dbusy$,2
dc0:	pop	ax
dc0a:	eproc	dcall
dc1:	test	byte ptr intflg,1
	jz	dc9
	cmp	word ptr nxtadr,0
	je	dc9
	test	byte ptr dbusy$,16
	jnz	dc9
	or	byte ptr dbusy$,16
	call	swpreg
	call	show
	call	word ptr nxtadr	;if otherwise, hop to it
	call	sclr
	call	swpreg
	and	byte ptr dbusy$,not 16
dc9:	eproc	dcall

	cproc	show,near
	mov	byte ptr scrmod,0FFh
	test	byte ptr intflg,2
	jz	sh9
	push	ax
	push	bx
	push	es
	mov	es,bseg		;bios segment
	mov	al,es:[49h]
	mov	bx,0B800h
	cmp	al,4
	jb	sh1
	cmp	al,6
	jbe	sh8		;bad video mode
sh1:	cmp	al,7
	ja	sh8
	jne	sh2
	mov	bh,0B0h
	mov	es,bx
	sub	bx,bx
	jmp	short sh3
sh2:	mov	es,bx
	sub	bx,bx
	cmp	al,2
	jae	sh3
	add	bx,39*2
	jmp	short sh4
sh3:	add	bx,79*2
sh4:	mov	scrmod,al
	mov	scradd,bx
	mov	scradd+2,es	;save position
	cmp	al,7
	je	sh6
	push	dx
	mov	dx,3DAh
sh5:	sti
	nop
	cli
	in	al,dx
	test	al,08h
	jz	sh5
	pop	dx
sh6:	mov	al,es:[bx]
	mov	scrsav,al	;save character, too
	mov	al,'+'
	test	byte ptr dbusy$,1
	jz	sh7
	mov	al,'*'
sh7:	mov	es:[bx],al
	sti
sh8:	pop	es
	pop	bx
	pop	ax
sh9:	eproc	show

	cproc	sclr,near
	cmp	byte ptr scrmod,0FFh
	je	cl9
	push	ax
	push	bx
	push	es
	les	bx,dword ptr scradd
	cmp	byte ptr scrmod,7
	je	cl2
	push	dx
	mov	dx,3DAh
cl1:	sti
	nop
	cli
	in	al,dx
	test	al,08h
	jz	cl1
	pop	dx
cl2:	mov	al,scrsav
	mov	es:[bx],al
	sti
	pop	es
	pop	bx
	pop	ax
cl9:	eproc	sclr

	cproc	swpreg,near
	xchg	ax,regs+0
	xchg	bx,regs+2
	xchg	cx,regs+4
	xchg	dx,regs+6
	xchg	bp,regs+8
	xchg	si,regs+10
	xchg	di,regs+12
	push	regs+14		;simulate xchg es,regs+14
	mov	regs+14,es
	pop	es
	pop	savadr		;save return address
	cli
	push	regs+18		;simulate xchg ss,regs+18
	mov	regs+18,ss
	pop	ss
	xchg	sp,regs+16
	sti
	push	savadr
	eproc	swpreg


;initialized variables (or defaults)

dfunc$	db	0		;last dos function #
dbusy$	db	1		;bit 0: dos busy
				;bit 1: dos request pending
				;bit 2: well-nested flag
				;bit 4: set during one of our own dos calls
				;bit 5: set during int 28 processing
kbmsk$	db	1Bh

bseg	dw	0040h
intflg	db	2		;bit 0: loaded  bit 1: show screen operation

;dos seg-dependent (and	unknown) functions

dfntbl	db	00h,26h,31h,4Bh,4Ch,4Dh
	db	18h,1Dh,1Eh,1Fh,20h,32h,34h,37h,50h,51h,52h,53h,55h
dfnend	label	byte

regs	dw	10 dup (?)	;register storage

wait	db	maxwait		;# of key calls to skip 1st
nxtadr	dw	0
savadr	dw	?		;return address storage
savbrk	db	?
savdta	dw	?,?
scrmod	db	?
scrsav	db	?
scradd	dw	?,?		;video memory address/character

vidjmp	dw	?,?
keyjmp	dw	?,?
dosjmp	dw	?,?
ds2jmp	dw	?,?		;addresses of original service routines

	endseg	cseg

	end			;end of	module
