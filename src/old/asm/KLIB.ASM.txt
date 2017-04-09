	title	keyboard functions


	include	dmac.asm	;macros

	public	$input,$inpck,$inpcl,$inpwt,$yesp,$yesno,$line
	public	lnbuf$


	defseg	cseg

	include	smac.asm	;string externals/macros

	cproc	$input,near	;return one character in ax
	mov	ah,08h
in0:	int	21h
	or	al,al
	jnz	in1
	dosf	08h		;retrieve/fix-up extended code
	mov	ah,al
	mov	al,0
in1:	eproc	$input

	cproc	$inpck,near	;check on kbd status
	dosf	0Bh
	or	al,al
	jne	in2
	stc			;carry set if no input available
in2:	eproc	$inpck

	cproc	$inpcl,near	;clear input, then get input
	mov	ax,0Ch*256+08h
	jmp	in0

	cproc	$inpwt		;print message, clear input, wait
	push	si
	print	wtmsg
	pop	si
	jmp	$inpcl

	cproc	$yesp,near
	print	si
	print	ynmsg
	cproc	$yesno,near	;return carry clear if yes response
yn1:	call	$input
	ucase	al
	cmp	al,10
	je	yn1		;ignore linefeed
	cmp	al,'Y'
	je	yn9
	cmp	al,'N'
	je	yn8
	cmp	al,27		;escape?
	je	yn7
	cmp	al,13		;return?
	mov	al,'N'
	je	yn8
	write	7		;ascii bell
	jmp	$yesno
yn7:	mov	al,' '-1	;force non-zero condition
	inc	al		;while keeping the carry flag
yn8:	stc
yn9:	pushf
	push	ax
	push	si
	write	al		;display the character accepted
	print	crlf
	pop	si
	pop	ax
	popf
	eproc	$yesno

	cproc	$line,near	;return a line of input in [si] buffer
	push	bx
	push	dx
	mov	bl,[si+1]	;get count from earlier
	mov	bh,0
	mov	byte ptr [si+bx+2],13
	mov	dx,si		;set up dos call
	dosf	0Ah		;buffered input function
	mov	bl,[si+1]	;bx has character count (excluding cr)
	inc	si
	inc	si
	mov	byte ptr [si+bx],0
	push	si
	print	crlf
	pop	si
	pop	dx
	pop	bx
	eproc	$line


;initialized variables (or defaults)

dtmp	db	8 dup (?)	;decimal string buffer

crlf	db	13,10,0
ynmsg	db	' (Y/[N])? ',0
wtmsg	db	13,10,'Press any key to continue...',0

lnbuf$	db	40,0,40 dup (?)	;default line input buffer

	endseg	cseg

	end			;end of	module
