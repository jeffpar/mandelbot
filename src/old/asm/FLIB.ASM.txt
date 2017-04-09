	title	floating-point library


	include	dmac.asm	;macro directives

;	Floating-point library routines

;	Internal format is 8 bytes, with highest byte containing the
;	exponent (bias 128), the highest bit of the next lower byte con-
;	taining the sign, and the binary point assumed to precede the first
;	bit, which is always 1 (and hence not stored) after normalization.

;	This differs from the 8-byte format used by the 8087 co-processor,
;	which uses an exponent of 11 bits instead of 8, has a sign bit that
;	precedes instead of follows the exponent bits, and has an assumed
;	binary point that follows the leading digit instead of preceding it.
;	So, internal conversions would be needed when 8087 support is added.


	public	$fset,$fres
	public	$fadd,$qadd,$fsub,$qsub
	public	$fmul,$qmul,$fdiv,$qdiv
	public	$fneg,$ftru,$frnd,$fsgn,$fcmp,$qcmp
	public	$fint,$fval,$fstr,$fread
	public	fnbuf$


	defseg	cseg

	include	kmac.asm	;keyboard externals/macros
	include	smac.asm	;string externals/macros

	cproc	$fset,near
	cld
	movsw			;[si] to [di]
	movsw
	movsw
	movsw
	sub	si,8
	sub	di,8
	eproc	$fset

	cproc	$fres,near
	call	savreg
fr0:	mov	si,offset ftmp	;[di] is operand
	jmp	$fset		;we set it to last result

	cproc	$fadd,near
	call	savreg
fa0:	xchg	si,di
	mov	cx,[di+6]	;[di] is operand to add to
fa0a:	mov	ax,[si+6]	;[si] is operand to add from
	cld
	or	ah,ah
	jnz	fa1a
fa1:	xchg	cx,ax
	mov	si,di
	mov	di,offset ftmp
	movsw	
	movsw	
	movsw	
	stosw	
	eproc	$fadd
fa1a:	cmp	ch,ah
	ja	fa2
	xchg	si,di
	xchg	cx,ax
	or	ah,ah
	jz	fa1
fa2:	sub	ah,ch
	neg	ah
	cmp	ah,38h
	ja	fa1
	shl	al,1
	rcr	cl,1
	xchg	cx,ax
	mov	cl,ch
	mov	ch,0
	push	ax
	push	di
	mov	di,cx
	lodsb	
	mov	ah,al
	xor	al,al
	xchg	dx,ax
	lodsw	
	xchg	cx,ax
	lodsw	
	xchg	bx,ax
	lodsw	
	or	ah,80h
	or	di,di
	jz	fa6
fa3:	cmp	di,0Eh
	jl	fa3b
	or	dx,dx
	jz	fa3a
	or	cl,1
fa3a:	mov	dx,cx
	mov	cx,bx
	mov	bx,ax
	xor	ax,ax
	sub	di,10h
	ja	fa3
	jz	fa6
	jb	fa4a
fa3b:	cmp	di,6
	jl	fa5
	or	dl,dl
	jz	fa4
	or	dh,1
fa4:	mov	dl,dh
	mov	dh,cl
	mov	cl,ch
	mov	ch,bl
	mov	bl,bh
	mov	bh,al
	mov	al,ah
	xor	ah,ah
	sub	di,8
	ja	fa5
	jz	fa6
fa4a:	shl	dx,1
	rcl	cx,1
	rcl	bx,1
	rcl	ax,1
	inc	di
	jnz	fa4a
	jmp	short fa6
fa5:	xchg	cx,di
	test	dl,3Fh
	jz	fa5a
	or	dl,20h
fa5a:	shr	ax,1
	rcr	bx,1
	rcr	di,1
	rcr	dx,1
	loop	fa5a
	xchg	cx,di
fa6:	pop	si
	xchg	di,ax
	test	dl,3Fh
	jz	fa6a
	or	dl,20h
fa6a:	pop	ax
	shl	al,1
	jo	fa7
	add	dh,[si]
	adc	cx,[si+1]
	adc	bx,[si+3]
	pushf	
	mov	si,[si+5]
	or	si,8000h
	popf	
	adc	di,si
	jnb	fa6B
	rcr	di,1
	rcr	bx,1
	rcr	cx,1
	rcr	dx,1
	inc	ah
fa6b:	jnz	round
	jmp	ovlerr
fa7:	not	al
	sub	dh,[si]
	sbb	cx,[si+1]
	sbb	bx,[si+3]
	pushf	
	mov	si,[si+5]
	or	si,8000h
	popf	
	sbb	di,si
	jnb	norm
	xor	si,si
	not	al
	not	di
	not	bx
	not	cx
	neg	dx
	cmc	
	adc	cx,si
	adc	bx,si
	adc	di,si
norm:	mov	si,0004h
nm1:	or	di,di
	jnz	nm2
	sub	ah,10h
	jbe	rn9
	dec	si
	jz	rn9
	mov	di,bx
	mov	bx,cx
	mov	cx,dx
	xor	dx,dx
	jmp	nm1
nm2:	test	di,0FF00h
	jnz	nm3
	sub	ah,8
	jbe	rn9
	xchg	di,ax
	mov	ah,al
	mov	al,bh
	mov	bh,bl
	mov	bl,ch
	mov	ch,cl
	mov	cl,dh
	mov	dh,dl
	mov	dl,0
	or	ah,ah
	xchg	di,ax
nm3:	js	round
nm3a:	dec	ah
	jz	rn9
	shl	dx,1
	rcl	cx,1
	rcl	bx,1
	rcl	di,1
	jno	nm3a
round:	cmp	dl,80h
	ja	rn1
	jb	rn2
	test	dh,01h
	jz	rn2
rn1:	add	dh,01h
	adc	cx,0
	adc	bx,0
	adc	di,0
	jnb	rn2
	inc	ah
	jz	rn8
rn2:	and	al,80h
	xchg	bx,di
	and	bh,7Fh
	or	al,bh
	mov	word ptr ftmp+6,ax
	mov	byte ptr ftmp+5,bl
	mov	bx,di
	mov	di,offset ftmp
	mov	al,dh
	stosb	
	xchg	cx,ax
	stosw	
	xchg	bx,ax
	stosw	
	eproc	$fadd	
rn7:	jns	rn9
rn8:	jmp	ovlerr
rn9:	mov	byte ptr ftmp+7,0
	eproc	$fadd

	cproc	$qadd,near
	push	si
	push	di
	call	fa0		;do addition without savreg
qa9:	pop	di
	mov	ax,di
	call	fr0		;then do assignment to [di] operand
	mov	di,ax
	pop	si
	eproc	$qadd

	cproc	$fsub,near
	call    savreg		;[si] is 1st operand
fu0:	xchg	si,di
	mov     cx,[di+6]	;[di] is operand to subtract from
	xor     cl,80h		;[si] is operand with amount to subtract
	jmp     fa0a

	cproc	$qsub,near
	push	si
	push	di
	call	fu0		;do subtraction without savreg
	jmp	qa9		;then do assignment to [di] operand

	cproc	$fmul,near
	call	savreg
fm0:	cld
	xchg	si,di
	mov	ax,[si+6]	;[di] is operand to multiply to
	or	ah,ah		;[si] is operand with amount to multiply
	jz	rn9
	mov	cx,[di+6]
	or	ch,ch
	jz	rn9
	xor	al,cl
	sub	ah,81h
	sub	ch,80h
	add	ah,ch
fm1:	jo	rn7
	add	ah,80h
	push	ax
	call	mul1
	jz	fm2
	or	dl,1
fm2:	pop	ax
	or	di,di
	js	fm3
	shl	dx,1
	rcl	cx,1
	rcl	bx,1
	rcl	di,1
	or	ah,ah
	jnz	fm9
	jmp	rn9
fm3:	inc	ah
	jnz	fm9
	jmp	ovlerr
fm9:	jmp	round

	cproc	$qmul,near
	push	si
	push	di
	call	fm0		;do multiplication w/o savreg
	jmp	qa9		;then do assignment to [di] operand

	cproc	mul1,near
	mov	al,[si+6]
	mov	ah,0
	or	al,80h
	mov	mtmp,ax
	mov	al,[di+6]
	mov	ah,0
	or	al,80h
	mov	mtmp+2,ax
	xor	bx,bx
	mov	bp,bx
	mov	cx,[si]
	jcxz	mu2
	xchg	cx,ax
	mov	cx,[di]
	jcxz	mu1
	mul	cx
	mov	bp,ax
	mov	cx,dx
	mov	ax,[si]
mu1:	mov	dx,[di+2]
	or	dx,dx
	jz	mu2
	mul	dx
	add	cx,ax
	adc	bx,dx
mu2:	push	bp
	xor	bp,bp
	mov	ax,[si+2]
	or	ax,ax
	jz	mu3
	mov	dx,[di]
	or	dx,dx
	jz	mu3
	mul	dx
	add	cx,ax
	adc	bx,dx
	rcl	bp,1
mu3:	pop	ax
	or	ax,cx
	push	ax
	mov	ax,[si+2]
	or	ax,ax
	jz	mu4
	mov	dx,[di+2]
	or	dx,dx
	jz	mu4
	mul	dx
	add	bx,ax
	adc	bp,dx
mu4:	xor	cx,cx
	mov	ax,[si]
	or	ax,ax
	jz	mu5
	mov	dx,[di+4]
	or	dx,dx
	jz	mu5
	mul	dx
	add	bx,ax
	adc	bp,dx
	rcl	cx,1
mu5:	mov	ax,[si+4]
	or	ax,ax
	jz	mu6
	mov	dx,[di]
	or	dx,dx
	jz	mu6
	mul	dx
	add	bx,ax
	adc	bp,dx
	adc	cx,0
mu6:	pop	ax
	or	ax,bx
	push	ax
	mov	ax,[si]
	or	ax,ax
	jz	mu6a
	mul	word ptr mtmp+2
	add	bp,ax
	adc	cx,dx
mu6a:	mov	ax,[di]
	or	ax,ax
	jz	mu6b
	mul	word ptr mtmp
	add	bp,ax
	adc	cx,dx
mu6b:	xor	bx,bx
	mov	ax,[si+2]
	or	ax,ax
	jz	mu7
	mov	dx,[di+4]
	or	dx,dx
	jz	mu7
	mul	dx
	add	bp,ax
	adc	cx,dx
	rcl	bx,1
mu7:	mov	ax,[si+4]
	or	ax,ax
	jz	mu7a
	mov	dx,[di+2]
	or	dx,dx
	jz	mu7a
	mul	dx
	add	bp,ax
	adc	cx,dx
	adc	bx,0
mu7a:	push	bp
	xor	bp,bp
	mov	ax,[di+2]
	or	ax,ax
	jz	mu7b
	mul	word ptr mtmp
	add	cx,ax
	adc	bx,dx
mu7b:	mov	ax,[si+2]
	or	ax,ax
	jz	mu7c
	mul	word ptr mtmp+2
	add	cx,ax
	adc	bx,dx
mu7c:	mov	ax,[si+4]
	or	ax,ax
	jz	mu8a
	mov	dx,[di+4]
	or	dx,dx
	jz	mu8
	mul	dx
	add	cx,ax
	adc	bx,dx
	rcl	bp,1
	mov	ax,[si+4]
mu8:	mul	word ptr mtmp+2
	add	bx,ax
	adc	bp,dx
mu8a:	mov	ax,[di+4]
	or	ax,ax
	jz	mu9
	mul	word ptr mtmp
	add	bx,ax
	adc	bp,dx
mu9:	mov	al,byte ptr mtmp
	mul	byte ptr mtmp+2
	add	ax,bp
	xchg	di,ax
	pop	dx
	pop	si
	or	si,si
	eproc	mul1

	cproc	$fdiv,near
	call	savreg
fd0:	cld
	xchg	si,di
	mov	ax,[si+6]	;[di] is operand divided into
	mov	cx,[di+6]	;[si] is operand with amount to divide by
	xor	al,cl
	or	ch,ch
	jz	fd9		;division by zero
	or	ah,ah
	jnz	fd1
	jmp	rn9
fd1:	sub	ah,80h
	sub	ch,80h
	sub	ah,ch
	jno	fd2
	jmp	fm1
fd2:	add	ah,80h
	push	ax
	lodsb	
	mov	ch,al
	xor	cl,cl
	lodsw	
	xchg	bx,ax
	lodsw	
	xchg	dx,ax
	lodsw	
	or	ah,80h
	xchg	dx,ax
	mov	si,di
	add	si,5
	mov	di,offset ftmp+6
	std	
	movsw	
	movsw	
	movsw	
	inc	si
	inc	di
	movsb	
	cld	
	mov	byte ptr [di],0
	or	byte ptr ftmp+7,80h
	shr	dx,1
	rcr	ax,1
	rcr	bx,1
	rcr	cx,1
	call	div1
	push	di
	call	div1
	push	di
	call	div1
	push	di
	call	div1
	or	ax,bx
	or	ax,cx
	or	ax,dx
	mov	dx,di
	jz	fd8
	or	dl,1
fd8:	pop	cx
	pop	bx
	pop	di
	jmp	fm2
fd9:	jmp	diverr

	cproc	$qdiv,near
	push	si
	push	di
	call	fd0		;do division without savreg
	jmp	qa9		;then do assignment to [di] operand

	cproc	div1,near
	mov	si,word ptr ftmp+6
	xor	di,di
	cmp	dx,si
	jnb	dv9
	or	dx,dx
	jnz	dv1
	cmp	si,ax
	ja	dv6
dv1:	div	si
	push	dx
	xchg	di,ax
	xor	bp,bp
	mov	si,bp
	mov	ax,word ptr ftmp
	or	ax,ax
	jz	dv2
	mul	di
	mov	si,dx
dv2:	push	ax
	mov	ax,word ptr ftmp+2
	or	ax,ax
	jz	dv3
	mul	di
	add	si,ax
	adc	bp,dx
dv3:	mov	ax,word ptr ftmp+4
	or	ax,ax
	jz	dv4
	mul	di
	add	bp,ax
	adc	dx,0
	xchg	dx,ax
dv4:	pop	dx
	neg	dx
	sbb	cx,si
	sbb	bx,bp
	pop	bp
	sbb	bp,ax
	xchg	bp,ax
dv6:	xchg	dx,ax
	xchg	cx,ax
	xchg	bx,ax
	jnb	dv8
dv7:	dec	di
	add	cx,word ptr ftmp
	adc	bx,word ptr ftmp+2
	adc	ax,word ptr ftmp+4
	adc	dx,word ptr ftmp+6
	jnb	dv7
dv8:	eproc	div1
dv9:	dec	di
	sub	cx,word ptr ftmp
	sbb	bx,word ptr ftmp+2
	sbb	ax,word ptr ftmp+4
	add	cx,word ptr ftmp+2
	adc	bx,word ptr ftmp+4
	adc	ax,dx
	mov	dx,word ptr ftmp
	cmc	
	jmp	dv6

	cproc	$fneg,near	;negate [di] operand sign
	xor	byte ptr [di+6],80h
	eproc	$fneg

	cproc	fcopy,near
	push    di
	cld
	mov	di,offset ftmp
	movsw
	movsw
	movsw
	movsw
	pop     di
	sub     si,8
	eproc	fcopy

	cproc	$ftru,near	;return truncated integer from [si] in ax
	call    fcopy
	push	bx
	mov	bx,si		;routines need address in bx
	push    cx
	mov     cx,6
	call    trunc1		;operate on ftmp now
	pop     cx
	pop	bx
ft1:	push	bx
	call	trunc2		;returns integer value in bx
	mov	ax,bx		;but we return the value in ax
	pop	bx
	eproc	$ftru

	cproc	$frnd,near	;returns a rounded integer from [si] in ax
	push	bx
	call	trunc3
	mov	ax,bx
	pop	bx
	eproc	$frnd

	cproc	trunc1,near
	push    ax
	push    bx
	push    di
	mov     al,byte ptr ftmp+7
	sub     al,80h
	jbe     tr2
	mov     di,offset ftmp+6
	mov     bl,al
	shr     al,1
	shr     al,1
	shr     al,1
	cbw
	sub     di,ax
	sub     cx,ax
	jb      tr1
	xchg    bx,ax
	and     al,07h
	mov     bx,offset tbl1
	xlat
	and     [di],al
	xor     al,al
	dec     di
	std
	repz	stosb
tr1:	pop     di
	pop     bx
	pop     ax
	eproc	trunc1
tr2:	mov     byte ptr ftmp+7,0
	jmp     tr1

	cproc	trunc2,near
	push    ax
	push    cx
	push    si
	mov     si,offset ftmp
	call    trunc4
	pop     si
	jmp     short tr5
tr3:	or      ah,ah
	jns     tr4
	sub	al,1
	sbb     bx,0
	shr     bx,cl
	not     bx
	jmp     short tr7
tr4:	shr     bx,cl
	jmp     short tr7
tr5:	xor     bx,bx
	or      ah,ah
	jz      tr7
	sub     ah,80h
	jb      tr7
	mov     bh,al
	mov     bl,ch
	xchg    cx,ax
	mov     cl,10h
	sub     cl,ch
	mov     ah,bh
	jb      tr8
	jz      tr7a
	or      bh,80h
	shr     bx,cl
	adc     bx,0
	jo      tr8a
	or      ah,ah
	jns     tr6
	neg     bx
tr6:	not     ah
	and     ah,bh
	js      tr8
tr7:	pop     cx
	pop     ax
	mov     word ptr ftmp+4,bx
	eproc	trunc2
tr7a:	cmp     bx,8000h
	jnz     tr8
	or      al,al
	jz      tr7
	test    al,80h
	jz      tr7
tr8:	jmp     ovlerr
tr8a:	or      ah,ah
	js      tr7
	jmp     tr8

	cproc	trunc3,near
	push    ax
	push    cx
	call    trunc4
	jmp     tr5

	cproc	trunc4,near
	mov     ax,[si+6]
	mov     cx,[si]
	or      cx,[si+2]
	jz      tr9
	mov     cx,1
tr9:	or      cx,[si+4]
	eproc	trunc4

	cproc	$fsgn,near	;return integer sign from [si] in ax
	mov     ax,[si+6]
	or      ah,ah
	jz      sg1
	mov     ah,81h
	and     al,80h
sg1:	mov     word ptr ftmp+6,ax
	sub     ax,ax
	mov     word ptr ftmp,ax
	mov     word ptr ftmp+2,ax
	mov     word ptr ftmp+4,ax
	jmp	ft1

	cproc	$fcmp,near
	call    savreg
fc0:	mov     cx,4		;compare [si] to [di], then
	add     si,6		;JB if less, JA if greater, JE if equal
	add     di,6
	mov     ax,[si]
	mov     bx,[di]
	or      bh,bh
	jz      fc3
	or      ah,ah
	jz      fc2
	xor     bl,al
	rcl     al,1
	js      fc9
	jnb     fc1
	xchg    si,di
fc1:	std
	repz	cmpsw
	eproc	$fcmp
fc2:	or      bh,bh
	rcl     bl,1
	cmc
	eproc	$fcmp
fc3:	or      ah,ah
	jz      fc9
	rcl     al,1
fc9:	eproc	$fcmp

	cproc	$qcmp,near
	push	si
	push	di
	call	fc0		;do comparison without savreg
	pop	di
	pop	si
	eproc	$qcmp

	cproc	$fint,near	;convert integer (ax) to floating-point [di]
	push    bx
	push    dx
	push    ax
	mov	bx,ax		;get operand in bx now
	mov     ax,9000h
	or      al,bh
	jns     fi1
	neg     bx
fi1:	xor     dx,dx
	call    snorm
	pop     ax
	pop     dx
	pop     bx
	mov     word ptr ftmp,0
	mov     word ptr ftmp+2,0
	jmp	$fres		;set the result into [di]

	cproc	snorm,near
	or      bx,bx
	jnz     sn1
	sub     ah,10h
	jbe     sn9
	xchg    bx,dx
	or      bx,bx
	jz      sn9
sn1:	or      bh,bh
	jnz     sn2
	sub     ah,8
	jbe     sn9
	mov     bh,bl
	mov     bl,dh
	mov     dh,dl
	mov     dl,0
	or      bh,bh
sn2:	js      sn3
sn2a:	dec     ah
	jz      sn9
	shl     dx,1
	rcl     bx,1
	jno     sn2a
sn3:	cmp     dl,80h
	ja      sn4
	jb      sn5
	test    dh,01h
	jz      sn5
sn4:	add     dh,01h
	adc     bx,0
	jnb     sn5
	inc     ah
	jz      sn8
sn5:	and     al,80h
	and     bh,7Fh
	or      al,bh
	mov     word ptr ftmp+6,ax
	mov     ah,bl
	mov     al,dh
	mov     word ptr ftmp+4,ax
	eproc	snorm
	jns     sn9
sn8:	jmp     ovlerr
sn9:    mov     byte ptr ftmp+7,0
	eproc	snorm

	cproc	$fval,near
	call	savreg
	push	di
	sub	ax,ax
	mov	di,offset ftmp1
	call	$fint		;ftmp1 = 0.0 (accumulates #)
	mov	ax,1
	mov	di,offset ftmp3
	call	$fint		;ftmp3 = 1.0 (divisor at end)
	sub	dx,dx		;dh records sign
	cld			;dl records point
fv2:	lodsb			;get byte of string
	or	al,al
	jz	fv8		;done
	cmp	al,'$'
	je	fv8
	cmp	al,' '
	je	fv2		;skip blanks
	cmp	al,'+'
	je	fv2		;we already assume positive
	cmp	al,'-'
	jne	fv3		;go to next check
	or	dh,80h		;negative sign is recorded now
	jmp	fv2
fv3:	cmp	al,'.'
	jne	fv4		;next check
	inc	dl		;reached decimal point
	jmp	fv2
fv4:	cmp	al,'0'
	jb	fv8
	cmp	al,'9'
	ja	fv8		;anything else and we'll just stop
	sub	al,'0'
	mov	ah,0		;ax has value of digit
	mov	di,offset ftmp2	;then we make a real number out of it
	call	$fint
	push	si
	push	dx
	mov	di,offset ftmp1	;before we can add [ftmp2], x by [ftmp10]
	mov	si,offset ftmp10
	call	$qmul
	mov	si,offset ftmp2
	call	$qadd		;add digit in now
	pop	dx		;now see if we should multiply our divisor
	or	dl,dl
	jz	fv5a
	inc	dl
	push	dx
	mov	si,offset ftmp10
	mov	di,offset ftmp3
	call	$qmul		;divisor = divisor * 10
fv5:	pop	dx
fv5a:	pop	si
	jmp	fv2		;loop back for more digits
fv8:	mov	di,offset ftmp1
	test	dh,80h		;negate?
	jz	fv8a
	call	$fneg
fv8a:	or	dl,dl
	jz	fv9
	mov	si,offset ftmp3
	call	$qdiv		;divide by divisor to adjust decimal point
fv9:	mov	si,di
	pop	di
	jmp	$fset		;set the result at [si] into [di]

	cproc	$fstr,near
	call	savreg
	cld
	mov	al,' '
	test	byte ptr [si+6],80h
	jz	fn0
	mov	al,'-'
fn0:	stosb			;store sign 1st
	push	di
	mov	di,offset ftmp1
	call	$fset		;move # to ftmp1
	and	byte ptr [di+6],not 80h
	mov	si,di
	mov	di,offset fmax
	call	$qcmp		;compares [si] to [di]
	jae	fn9		;set carry to indicate too large
	mov	si,di
	mov	di,offset ftmp2	;use fmax to create subtracter at ftmp2
	call	$fset
	pop	di
	sub	dx,dx		;dh counts digits
fn1:	push	di		;save string position
	push	dx
	mov	di,offset ftmp2
	mov	si,offset ftmp10
	call	$qdiv		;subtracter ready
	pop	dx
	mov	dl,0		;dl counts subtractions
fn2:	push	dx
	mov	si,offset ftmp1
	call	$qcmp		;compare # to subtracter 1st
	jb	fn3		;done at this level of subtraction
	xchg	si,di
	call	$qsub
	xchg	si,di
	pop	dx
	inc	dl		;one subtraction done
	jmp	fn2
fn3:	pop	dx		;get count
	pop	di		;bring string position back
	mov	al,dl
	add	al,'0'
	cld
fn4:	stosb			;digit stored
	inc	dh		;increment digit counter
	mov	al,'.'
	cmp	dh,9
	je	fn4
	cmp	dh,30
	jb	fn1		;go back & reduce subtracter, count again
	clc
	mov	al,0		;terminate string
	stosb
	eproc	$fstr		;savreg will restore address of the string
fn9:	pop	di
	stc
	eproc	$fstr

	cproc	$fread,near
	print	si
	readln
	jmp	$fval		;si has address of input, di has fp address

	cproc	ovlerr,near
	mov	si,offset ovlmsg
er1:	push	si
	print	crlf
	pop	si
	print	si
	exit	9		;fatal floating-point error

	cproc	diverr,near
	mov	si,offset diverr
	jmp	er1

	cproc	savreg,near
	pop	rtnadr
	push    ax
	push    bx
	push    cx
	push    dx
	push    bp
	push    si
	push    di
	call    word ptr rtnadr
	pop     di
	pop     si
	pop     bp
	pop     dx
	pop     cx
	pop     bx
	pop     ax
	eproc	savreg


;initialized variables (or defaults)

ftmp	dq	0		;storage for temp calculations
ftmp1	dq	?		;storage for conversions
ftmp2	dq	?
ftmp3	dq	?
ftmp10	dq	10.0		;for decimal conversions
fmax	dq	1000000000.0
mtmp	dw	?,?		;storage for multiplications
fnbuf$	db	32 dup (?)	;storage for floating-point strings

tbl1	db	000h,080h,0C0h,0E0h,0F0h,0F8h,0FCh,0FEh

rtnadr	dw	?		;address of the routine invoking savreg

divmsg	db	'Division by zero'
crlf	db	13,10,0
ovlmsg	db	'Floating-point overflow',13,10,0

	endseg	cseg

	end			;end of module
