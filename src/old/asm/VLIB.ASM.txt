	title	video utilities


	include	dmac.asm	;macros
	include	bmac.asm	;ROM-Bios macros

	public	$vinit,$vexit,$vmode,$vclrs,$vsclv
	public	$vwrts,$vwrtc,$vpos,$vcur,$vcolr,$vbox


	defseg	cseg

	include	smac.asm

	cproc	$vinit,near	;mode determination
	push	cs
	push	cs
	pop	ds
	pop	es
	dosf	30h		;check version
	cmp	al,2
	jae	via
	print	vermsg
	int	20h
via:	setvec	23h,vi0		;set ctrl-break vector
	jmp	short vi1
vi0:	mov	al,1
	call	$vexit
vi1:	getvst
	mov	vmode,al
	mov	vsize,ah
	mov	vpage,bh
	cmp	byte ptr omode,0FFh
	jne	vi9
	mov	omode,al
vi9:	eproc	$vinit

	cproc	$vexit,near
	push	ax
	mov	al,omode	;current mode
	cmp	al,vmode	;same as old mode?
	je	ve9		;yes, so just exit program
	call	$vmode
ve9:	pop	ax
	exit	al		;exit program

	cproc	$vmode,near	;define mode (al), clear screen
	cmp	omode,al
	je	vm1
	cmp	byte ptr omode,7
	jne	vm1
	print	crdmsg		;graphics card required...
	int	20h
vm1:	setmde	al
	jmp	vi1

	cproc	$vclrs,near	;clear any portion of the screen
	push	cx
	mov	cl,0
	call	$vsclv
	pop	cx
	eproc	$vclrs

	cproc	$vsclv,near	;scroll any portion of the screen
	push	ax
	push	bx
	push	cx
	push	dx
	push	bp
	xchg	al,ah
	xchg	ax,cx
	mov	dx,cx
	add	dh,bl
	dec	dh
	add	dl,bh
	dec	dl
	mov	bh,vcolr
	mov	ah,6		;select	function
	or	al,al
	jns	vs1
	inc	ah
	neg	al
vs1:	int	10h		;perform bios scroll
	pop	bp
	pop	dx
	pop	cx
	pop	bx
	pop	ax
	eproc	$vsclv

	cproc	$vwrts,near	;write an asciz string
	push	ax
	push	bx
	push	cx
	push	dx
	push	bp
	mov	al,0FFh
	call	$vpos
	mov	dx,ax
vw1:	mov	ax,dx
	call	$vpos		;set cursor
	cld
	lodsb			;get next character
	or	al,al
	je	vw2
	cmp	al,255
	je	vw2
	vdwrit	al,vcolr,vpage,1
	inc	dh
	cmp	dh,vsize	;check width of screen
	jb	vw1
	mov	dh,0
	inc	dl
	cmp	dl,25		;check height of screen
	jb	vw1
	dec	dl
	sub	ax,ax		;set up scroll parameters
	mov	bx,25+80*256
	call	$vsclv		;scroll up
	jmp	vw1
vw2:	pop	bp
	pop	dx
	pop	cx
	pop	bx
	pop	ax
	eproc	$vwrts

	cproc	$vwrtc,near	;write one ascii character
	push	si
	mov	si,offset vdtmp
	mov	[si],al
	mov	byte ptr [si+1],0
	call	$vwrts
	pop	si
	eproc	$vwrtc

	cproc	$vpos,near	;get/set cursor position
	push	bx
	push	cx
	push	dx
	push	bp
	cmp	al,0FFh
	jne	vp1
	getcst	vpage
	mov	ax,dx
	xchg	al,ah
	jmp	short vp9
vp1:	push	ax
	xchg	al,ah		;row/column passed in al/ah
	mov	dx,ax
	setcps	dh,dl,0		;(order	switched for bios' sake)
	pop	ax
vp9:	pop	bp
	pop	dx
	pop	cx
	pop	bx
	eproc	$vpos

	cproc	$vcur,near	;get/set cursor type
	push	bx
	push	cx
	push	dx
	push	bp
	cmp	al,0FFh
	jne	vc1
	getcst	vpage		;get cursor state for current page
	mov	ax,cx
	jmp	short vc9
vc1:	cmp	byte ptr vmode,7
	jne	vc4
	cmp	ax,6*256+7
	jne	vc2
	mov	ax,11*256+12
vc2:	cmp	ax,1*256+5
	jne	vc3
	mov	ax,3*256+9
vc3:	cmp	ax,0*256+7
	jne	vc4
	mov	al,13
vc4:	mov	cx,ax
	push	ax
	setctp	ch,cl
	pop	ax
vc9:	pop	bp
	pop	dx
	pop	cx
	pop	bx
	eproc	$vcur

	cproc	$vcolr,near	;get/set default color
	or	al,al
	jnz	vco1
	mov	al,vcolr
	eproc	$vcolr
vco1:	cmp	byte ptr vmode,0
	je	vco2		;check for b&w modes
	cmp	byte ptr vmode,2
	je	vco2
	cmp	byte ptr vmode,7
	jne	vco9
vco2:	and	al,7Fh		;remove color attributes
	mov	ah,al
	and	ah,07h		;see if	underline...
	cmp	ah,1		;if so,	then just fix up background
	je	vco5
	test	al,07h		;foreground black?
	jnz	vco4
vco3:	or	al,70h		;then background must be white
	jmp	short vco9	;otherwise,
vco4:	or	al,07h
vco5:	test	al,08h		;check the brightness of the white
	jz	vco6
	test	al,70h
	jnz	vco3
vco6:	and	al,not 70h	;normal	foreground needs black background
vco9:	mov	vcolr,al
	eproc	$vcolr

	cproc	$vbox,near	;display a box
	push	ax
	push	bx
	push	dx
	push	si
	mov	minmum,ax	;save minimum row/col values
	add	bl,al
	dec	bl
	add	bh,ah
	dec	bh
	mov	maxmum,bx	;save maximum row/col values
	sub	dh,dh
	dec	dl
	shl	dx,1
	shl	dx,1
	shl	dx,1
	mov	si,offset boxtbl
	add	si,dx
	cmp	si,offset boxend
	jb	vb1
	mov	si,offset boxtbl
vb1:	call	$vpos
	mov	dl,[si]		;get upper-left	corner
	call	boxdsp
	mov	dl,[si+1]	;get top line
vb2:	inc	ah
	call	$vpos
	cmp	ah,maxcol
	jae	vb3
	call	boxdsp
	jmp	vb2
vb3:	mov	dl,[si+2]	;get upper-right corner
	call	boxdsp
	mov	dl,[si+3]	;get right line
vb4:	inc	al
	call	$vpos
	cmp	al,maxrow
	jae	vb5
	call	boxdsp
	jmp	vb4
vb5:	mov	dl,[si+4]	;get lower-right corner
	call	boxdsp
	mov	dl,[si+5]	;get bottom line
vb6:	dec	ah
	call	$vpos
	cmp	ah,mincol
	jbe	vb7
	call	boxdsp
	jmp	vb6
vb7:	mov	dl,[si+6]	;get lower-left	corner
	call	boxdsp
	mov	dl,[si+7]	;get left line
vb8:	dec	al
	call	$vpos
	cmp	al,minrow
	jbe	vb9
	call	boxdsp
	jmp	vb8
vb9:	pop	si
	pop	dx
	pop	bx
	pop	ax
	eproc	$vbox

	cproc	boxdsp,near
	push	ax
	mov	al,dl
	call	$vwrtc
	pop	ax
	eproc	boxdsp


;initialized variables (or defaults)
	even

omode	db	0FFh		;original video mode
vmode	db	?		;current mode
vsize	db	?		;current width
vpage	db	?		;current page
vcolr	db	7		;current color byte
vdtmp	db	?		;temporary character storage

boxtbl	db	201,205,187,186,188,205,200,186
	db	218,196,191,179,217,196,192,179
boxend	label	byte

minmum	label	word		;video working storage
minrow	db	?
mincol	db	?
maxmum	label	word
maxrow	db	?
maxcol	db	?

vermsg	db	'DOS Version 2.00 or later is needed',13,10,0
crdmsg	db	'Monochrome card cannot display graphics',13,10,0

	endseg	cseg

	end			;end of	module
