	title	string functions


	include	dmac.asm	;macros

	public	$print,$scan,$size,$scopy,$dval,$dstr,$ucase,$chksw
	public	dnbuf$


	defseg	cseg

	cproc	$print,near
	push	ax
	push	cx
	push	dx
	push	si
pr1:	mov	dx,si
	mov	al,'$'
	call	$scan
	jb	pr2
	writes	dx		;write string through dos
	write	'$'
	inc	si		;ready to look at next part of string
	jmp	pr1
pr2:	mov	si,dx		;rest of asciz string has no $
	call	$size
	jcxz	pr9
	mov	dx,si
	add	si,cx		;jump to null
	mov	byte ptr [si],'$'
	writes	dx		;write rest of string through dos
	mov	byte ptr [si],0
pr9:	pop	si
	pop	dx
	pop	cx
	pop	ax
	eproc	$print

	cproc	$scan,near
	call	$ucase
	mov	ah,al
	cld
sn1:	lodsb
	or	al,al
	cmc
	jz	sn9
	call	$ucase
	cmp	al,ah
	jne	sn1
	dec	si
sn9:	eproc	$scan

	cproc	$size,near
	push	si
	cld
	sub	cx,cx
si1:	lodsb
	or	al,al
	jz	si9
	inc	cx
	jmp	si1
si9:	pop	si
	eproc	$size

	cproc	$scopy,near
	push	si
	push	di
	cld
sc1:	lodsb
	stosb
	or	cx,cx
	jnz	sc2
	or	al,al		;al is last byte copied
	jnz	sc1
	jmp	short sc8
sc2:	loop	sc1		;cx is # bytes not copied
sc8:	pop	di
	pop	si
sc9:	eproc	$scopy

	cproc	$dval,near	;return ax with value of [si]
	push	cx
	push	dx
	sub	ax,ax		;numeric total
	mov	cx,5		;maximum digits
	mov	dh,0
dv1:	mov	dl,[si]		;pick off a digit
	cmp	dl,'0'
	jb	dv9
	cmp	dl,'9'
	ja	dv9		;and make sure it's a digit
	sub	dl,'0'
	push	dx
	mov	dx,10
	mul	dx
	pop	dx
	add	ax,dx
	inc	si
	loop	dv1
dv9:	pop	dx
	pop	cx
	eproc	$dval

	cproc	$dstr,near	;return si with address of string
	push	ax
	push	bx
	push	cx
	push	dx
	mov	dx,ax		;use dx to hold ax
	add	di,6
	std
	mov	al,0		;terminate string first
	stosb
	mov	cx,5
	mov	bx,10
dc1:	mov	ax,dx
	sub	dx,dx
	div	bx
	xchg	dx,ax
	add	al,30h
	stosb
	or	dx,dx
	loopnz	dc1
dc2:	mov	al,' '		;pad with leading blanks back to beginning
	rep	stosb
	inc	di
dc9:	pop	dx
	pop	cx
	pop	bx
	pop	ax
	eproc	$dstr

	cproc	$ucase,near	;convert al to upper-case
	cmp	al,'a'
	jb	uc9
	cmp	al,'z'
	ja	uc9
	sub	al,32
uc9:	eproc	$ucase

	cproc	$chksw		;check command line for switch in al
	call	$ucase
	mov	ah,al
	push	cx
	push	si
	mov	si,80h		;offset of parameter area in prefix segment
	mov	cl,[si]
	mov	ch,0
	jcxz	ck8
	inc	si
ck1:	cmp	byte ptr [si],' '
	jne	ck1a
	cmp	byte ptr [si+1],'/'
	je	ck2
	cmp	byte ptr [si+1],'-'
	je	ck2
	jmp	short ck8
ck1a:	cmp	byte ptr [si],'/'
	je	ck1b
	cmp	byte ptr [si],'-'
	jne	ck2
ck1b:	mov	al,[si+1]
	call	$ucase
	cmp	al,ah
	jne	ck2
	inc	si
	inc	si
	mov	ax,0
	cmp	byte ptr [si],':'
	je	ck1c
	cmp	byte ptr [si],'0'
	jb	ck9
	cmp	byte ptr [si],'9'
	ja	ck9
	dec	si
ck1c:	inc	si
	call	$dval		;return any value associated with switch
	jmp	short ck9
ck2:	inc	si
	loop	ck1
ck8:	stc
	jmp	short ck9+1
ck9:	clc
	pop	si
	pop	cx
	eproc	$chksw


;initialized variables (or defaults)

dnbuf$	db	8 dup (?)	;decimal string buffer

	endseg	cseg

	end			;end of	module
