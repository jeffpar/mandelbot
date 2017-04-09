        title   mandelbrot microscope


        include dmac.asm	;macro directives

;       Mandelbrot Microscope  Version 2.10
;       Copyright 1986 by Radix 2 Software and by Jeff Parsons
;
;	Switches
;	/Mn  multiplies the iteration limit (maxloop) by n
;	/L - causes program remain resident
;	     after initial parameters entered, unloads at completion
;	/C - causes the Ctrl key disable background calculations, too
;	/S - meaningful only with /L, and suppresses flashing indicator
;	/P - meaningful only if restoring from MEM file,
;	     in which case a keyboard input is required after each frame
;	/B - meaningful only with /P, and rings the system bell after a frame


maxcalc	equ	16		;MUST be a POWER of 2,
				;maximum # of iterations
				;per pixel during background operation

maxloop	equ	250		;normally 250 (algorithm is usually 1000)


        defseg  cseg		;declare code segment

        include vmac.asm	;video module externals/macros
	include	kmac.asm	;keyboard externals/macros
	include	smac.asm	;string externals/macros
        include fmac.asm	;floating-point externals/macros
	include	mmac.asm	;memory module externals
	include	imac.asm	;interrupt module externals/macros

        org     origin

        cproc   main
	call	$vinit
        print   mbmsg		;say hi
	chksw	'm'
	jb	ma
	mov	lmul,al
ma:	chksw	'l'
	jb	m0
	call	$igrab
	inc	byte ptr ldflg
	jmp	short m0a
m0:	chksw	's'
	jb	m00
	inc	byte ptr dspflg
m00:	yesno	rsmsg		;restore from file?
	jb	m0a
	inc	byte ptr rst	;yes, so flag it
m0a:	print	fnmsg
	readln			;returns string at [si]
	scopy	si,fnext	;copy string to extension
	mov	dx,offset fname
	mov	al,rst
	inc	al
	dosf	3Dh		;open file call
	jnb	m0c
	cmp	byte ptr rst,0
	je	m0b		;go ahead and create
	print	fnerr
	jmp	m0a		;file not found, so ask again
m0b:	sub	cx,cx
	dosf	3Ch		;create file call
	jnb	m0d
	print	fcerr		;unable to create file
	jmp	m0a
m0c:	cmp	byte ptr rst,0
	jne	m0d
	push	ax		;if we wanted to write a file
	yesno	ovmsg		;and it already existed
	pop	ax		;make sure they want to overwrite
	jnb	m0d
	mov	bx,ax
	dosf	3Eh		;close file call
	jmp	m0a
m0d:	mov	fnum,ax		;save file handle #
	mov	bx,ax
	cmp	byte ptr rst,0
	je	m0e
	mov	cx,128*3	;restore...
	mov	dx,offset filtbl
	dosf	3Fh
	call	init		;perform initial calculations
m0dd:	jmp	m2b
m0e:	readf	xcmsg,xcenter	;prompt for x of center
	readf	ycmsg,ycenter	;prompt for y of center
	readf	xsmsg,xsize	;prompt for width of window
	readf	pcmsg,percent
	readf	yxmsg,yfactor
m1:	yesno	comsg		;color (y/n)?
	jb	m1b		;all defaults are set
m1a:	print	lomsg		;low resolution required
	jmp	short m2
m1b:	yesno	himsg		;since not color, high-res or not?
	jnb	m1c
	inc	byte ptr mode
	dec	byte ptr pall
	jmp	short m1a
m1c:	mov	byte ptr mode,6	;select high-res mode, and double width
	mov	byte ptr colr,light+blue
m2:	call	init		;perform initial calculations
	cmp	byte ptr ldflg,0
	je	m0dd
	mov	bx,fnum
	dosf	3Eh		;close handle
	mov	si,offset fname
	mov	di,5Ch		;default fcb
	mov	al,0
	dosf	29h		;parse filename
	mov	dx,di
	dosf	0Fh		;open fcb
	mov	byte ptr [di+32],0
	mov	cx,3		;number of records
	mov	di,offset filtbl
m2a:	push	dx
	mov	dx,di
	dosf	1Ah		;set dta to file info
	pop	dx
	dosf	15h		;write a 128-byte block
	add	di,128
	loop	m2a
	mov	di,80h		;then back to normal dta
	mov	dx,di
	dosf	1Ah		;set it
	cld
	push	ds
	pop	es
	mov	al,0
	mov	cx,128
	rep	stosb		;clear out dta
	mov	ax,hwidth
	mul	word ptr vwidth	;dx:ax has (hwidth * vwidth) now
	mov	cx,128
	div	cx		;dx:ax divided by 128 gives # records in ax
	mov	cx,ax
	mov	dx,5Ch		;back to our fcb now
m2aa:	dosf	15h		;zap the file, allocating needed space
	or	al,al
	jnz	m2aaa		;handle error elsewhere
	loop	m2aa
	dosf	10h		;then close the fcb to update directory
	dosf	0Fh		;re-open...
	or	al,al
	jnz	m2aaa
	mov	di,dx		;then fix up the fcb beginning record #
	mov	byte ptr [di+32],3
	print	resmsg
	call	$iexit		;set address to begin running
	jmp	m2x
m2aaa:	print	fcerr
	mov	al,1
	jmp	$vexit		;set errorlevel to 1, cannot create file
m2b:	wait
	test	byte ptr mode,80h
	jz	m2c
	inc	byte ptr vrst	;direct video memory restore
	and	byte ptr mode,not 80h
m2c:	screen	mode		;screen mode (color/graphics)
	setplt	pall		;palette # (only 0 or 1 allowed)
	setclr	colr		;background color (intensity affects palette)
	cmp	byte ptr vrst,0
	je	m2d
	call	rstmem		;restore video memory
	readc			;and...
	jmp	m9x		;just exit program afterward
m2d:	cmp	byte ptr dspflg,0
	je	m2g		;no numeric display
	mov	dx,ovw		
	cmp	dx,9
	jb	m2g		;no room for values
	dec	dx
	shr	dx,1
	shr	dx,1
	shr	dx,1
	dec	dx		;dl has row #
	mov	dh,2		;dh gets starting column...
	test	byte ptr mode,02h
	jz	m2e		;based on selected video mode
	mov	dh,22
m2e:	color	1		;set character color
	locate	dl,dh
	disps	xmsg
	strf	xcenter
	mov	si,di
	disps	si		;display center x
	mov	al,24		;24-(line #) gives bottom line #
	sub	al,dl
	mov	dl,al
	locate	al,dh
	disps	ymsg
	strf	ycenter
	mov	si,di
	disps	si		;display center y
	inc	dl
	cmp	dl,25
	jae	m2g
	locate	dl,dh
	disps	wmsg
	strf	xsize
	mov	si,di
	disps	si		;display horizontal size if room permits
m2g:	cmp	byte ptr rst,0
	jne	m2x
	mov	bx,fnum		;if not restoring
	mov	cx,128*3	;then write important beginning info
	mov	dx,offset filtbl
	dosf	40h
m2x:	setf	xcorner,xsize
	divby	xcorner,two	;xcorner := xsize / 2.0
	negf	xcorner		;xcorner := - (xsize / 2.0)
	addto	xcorner,xcenter	;xcorner := xcenter - (xsize / 2.0)
	setf	ycorner,ysize
	divby	ycorner,two	;ycorner := ysize / 2.0
	negf	ycorner		;ycorner := - (ysize / 2.0)
	addto	ycorner,ycenter	;ycorner := ycenter - (ysize / 2.0)
	setf	y,ycorner
	addto	y,ysize		;y := ycorner + ysize
	mov	ax,vwidth
	mov	yi,ax		;loop:  from yi = vwidth downto 1
mly:	setf	x,xcorner	;x := xcorner
	mov	word ptr xi,1	;loop:  from xi = 1 to hwidth
mlx:	cmp	byte ptr rst,0
	je	m3b
	mov	bx,fnum
	if	maxloop gt 255
	mov	cx,2
	else
	mov	cx,1
	endif
	mov	dx,offset c
	dosf	3Fh		;file read
	jb	m3a
	cmp	ax,cx
	jb	m3a
	if	maxloop le 255
	mov	al,0
	cmp	byte ptr c,0FFh
	jne	mlx1
	dec	al
mlx1:	mov	byte ptr c+1,al
	endif
	cmp	word ptr c,0
	jne	m3
	sub	cx,cx		;if zero was read
	sub	dx,dx		;then we determine position
	mov	al,1
	dosf	42h
	sub	ax,1		;back up once
	sbb	dx,0
	mov	cx,dx
	mov	dx,ax
	mov	al,0
	dosf	42h		;set to that position
	jmp	short m3a
m3:	jmp	m5
m3a:	mov	byte ptr rst,0
m3b:	setf	a,zero		;a := 0.0
	setf	b,zero		;b := 0.0
	setf	m,zero		;m := 0.0
	setf	ta,zero		;ta := 0.0
	setf	tb,zero		;tb := 0.0
	mov	word ptr c,0	;c := 0
m4:	multby	b,a		;b := b * a
	multby	b,two		;b := (b * a) * 2.0
	addto	b,y		;b := ((b * a) * 2.0) + y
	setf	a,ta		;a := ta
	subfrm	a,tb		;a := ta - tb
	addto	a,x		;a := (ta - tb) + x
	setf	ta,a		;ta := a
	multby	ta,a		;ta := a * a
	setf	tb,b		;tb := b
	multby	tb,b		;tb := b * b
	setf	m,ta		;m := ta
	addto	m,tb		;m := ta + tb
	test	word ptr c,maxcalc-1
	jnz	m4a
	call	$iexit
m4a:	inc	word ptr c
	cmpto	m,four		;compare m against 4.0
	jae	m5		;above or equal means we can exit this loop
	mov	ax,c
	cmp	ax,limit
	jae	m5
	jmp	m4
m5:	cmp	byte ptr ldflg,0
	jne	m7a		;skip plot/kbd check during loaded run
	mov	cx,xi		;set plot column
	dec	cx		;relative to zero, not one
	test	cx,8-1
	jnz	m5a
	chkbd			;check kbd 1 out every 8 plots
m5a:	add	cx,ohw		;add any offset
	mov	dx,vwidth
	sub	dx,yi		;set plot row, relative to zero
	add	dx,ovw		;add any offset
	mov	ax,c		;get count, used to determine color
	mov	bx,offset clrtbl
	cmp	ax,limit
	jb	m6
	mov	al,[bx+255]	;color for true mandelbrot point
	mov	byte ptr c,0FFFFh
	jmp	short m7
m6:	dec	ax		;make relative to 0
	cmp	ax,maxloop
	jb	m6a
	push	dx
	mov	dl,maxloop
	div	dl		;al gets result, ah remainder
	pop	dx
	mov	al,ah
m6a:	xlat			;translate count into color # in table
m7:	plot	dx,cx,al	;do plot
m7a:	cmp	byte ptr rst,0
	jne	m7x
	mov	bx,80h
	mov	si,fcnt
	mov	ax,c
	mov	[bx+si],ax	;save value
	inc	si
	if	maxloop gt 255
	inc	si
	endif
	mov	fcnt,si
	cmp	si,128
	jb	m7b
	call	$idos
	call	writef
m7b:	call	$iexit
m7x:	addto	x,xgap		;x := x + xgap
	inc	word ptr xi
	mov	ax,xi
	cmp	ax,hwidth	;done with the x-loop?
	ja	m8		;yes
	jmp	mlx		;if not, go back to beginning of the loop
m8:	subfrm	y,ygap		;y := y - ygap
	dec	word ptr yi
	jz	m9
	jmp	mly		;not quite done with the y-loop yet
m9:	call	$idos
	call	flushf		;flush
	call	$ifree		;we're done
	write	7		;ring the bell thrice when done
	write	dl
	write	dl
	readc			;now that we're done, let's wait for input
	ucase	al
	cmp	al,'S'		;(S)ave image?
	jne	m9x		;if so...
	call	savmem		;add video memory image to MEM file
m9x:	mov	al,0
	jmp	$vexit		;exit back to dos, no errorlevel is reported

	cproc	init,near
	test	byte ptr mode,02h
	jz	in0		;that bit only set if high-res mode
	shl	word ptr hwidth,1
in0:	cmpto	percent,zero
	jne	in1
	setf	percent,hundred
in1:	divby	percent,hundred
	cmpto	yfactor,zero
	jne	in2
	setf	yfactor,one
in2:	mov	ax,hwidth	;save original pixel widths
	mov	ohw,ax
	mov	ax,vwidth
	mov	ovw,ax
	setf	ysize,xsize	;should really be some fraction of xsize
	multby	ysize,yfactor
	intf	temp,hwidth	;temp := hwidth
	multby	temp,percent	;adjust this width by percentage
	round	temp
	sub	ohw,ax
	shr	word ptr ohw,1
	mov	hwidth,ax	;update integer, too
	setf	xgap,xsize
	divby	xgap,temp	;xgap := xsize / temp
	intf	temp,vwidth	;temp := vwidth
	multby	temp,percent	;adjust this width by percentage
	round	temp
	sub	ovw,ax
	shr	word ptr ovw,1
	mov	vwidth,ax	;update integer, too
	setf	ygap,ysize
	divby	ygap,temp	;ygap := ysize / temp
	multby	percent,hundred	;restore percentage from fraction back to %
	mov	al,lmul
	or	al,al
	jz	in9
	mov	ah,0
	mul	word ptr limit
	mov	limit,ax
in9:	eproc	init

	cproc	writef,near
	cmp	byte ptr ldflg,0
	jne	wr2
	mov	dx,80h
	mov	cx,fcnt
	jcxz	wr9
	mov	bx,fnum
	dosf	40h		;file write call
	jmp	short wr8
wr2:	mov	dx,5Ch		;or write from full dta
	dosf	15h
wr8:	sub	si,si
	mov	fcnt,si
wr9:	eproc	writef

	cproc	flushf,near
	cmp	byte ptr ldflg,0
	jne	fl1
	call	writef
	mov	bx,fnum
	dosf	3Eh
	eproc	flushf
fl1:	cmp	word ptr fcnt,0
	je	fl2
	mov	word ptr c,0
	call	writef
	jmp	fl1
fl2:	mov	dx,5Ch
	dosf	10h
	eproc	flushf

	cproc	savmem,near
	mov	ax,3Dh*256+2
	mov	dx,offset vname
	int	21h		;open file call
	jnb	sv2
	sub	cx,cx
	dosf	3Ch		;create file call
	jnb	sv1
	print	fcerr		;unable to create file
	wait
	eproc	savmem
sv1:	mov	bx,ax		;write file header
	mov	cx,128
	mov	dx,offset filtbl
	or	byte ptr mode,80h
	dosf	40h		;write it
	and	byte ptr mode,not 80h
	mov	ax,bx
sv2:	mov	bx,ax		;get file handle #
	mov	ax,42h*256+2
	sub	cx,cx
	sub	dx,dx
	int	21h		;positioned at end of file
	mov	dx,ovw
	mov	cx,ohw		;initial coordinates
	mov	ax,0B800h
	mov	es,ax		;video segment
sv3:	cmp	word ptr vwidth,0
	je	sv8		;do rows until vwidth dropped to zero
	call	getoff
	push	cx
	push	ax
	add	cx,hwidth
	dec	cx
	call	getoff
	pop	di
	sub	ax,di		;subtract last address from new
	inc	ax
	mov	cx,ax		;cx has # bytes
	mov	ax,di
	call	putbyt		;write low-byte of offset
	mov	al,ah
	call	putbyt		;write high-byte of offset
	mov	al,cl
	call	putbyt		;write # bytes this row
sv4:	mov	al,es:[di]
	inc	di
	call	putbyt
	loop	sv4		;loop for all video bytes this row
	pop	cx
	inc	dx
	dec	word ptr vwidth
	jmp	sv3
sv8:	mov	al,0FFh
	call	putbyt
	call	putbyt		;terminate list of rows with FFFFh offset
	dosf	3Eh		;close file
	eproc	savmem

	cproc	rstmem,near
	mov	bx,fnum
	mov	ax,42h*256+0
	sub	cx,cx
	mov	dx,128
	int	21h
	mov	ax,cs		;get current segment
	mov	dx,offset cgrp:end$
	mov	cl,4
	shr	dx,cl		;get total paragraphs
	add	ax,dx
	mov	es,ax		;segment of free memory
rs2:	sub	di,di
	mov	cx,16*k/2	;clean out our graphics buffer
	cld
	sub	ax,ax
	rep	stosw		;cleaned....
rs3:	call	getbyt
	jb	rs9
	xchg	al,ah
	call	getbyt
	jb	rs9
	xchg	al,ah
	mov	dx,ax		;set up video memory offset
	inc	ax
	jz	rs8		;encountered FFFFh marker
	call	getbyt
	mov	ah,0
	mov	cx,ax		;and set # of bytes to transfer
	push	ds
	push	es
	pop	ds
	dosf	3Fh		;read it directly
	pop	ds		;into our dummy graphics buffer
	jmp	rs3
rs8:	push	es		;save memory segment address
	mov	ax,0B800h
	mov	es,ax		;point it to the real thing, now
	sub	di,di
	mov	si,offset cgrp:end$
	mov	cx,16*k/2
	cld
	rep	movsw
	pop	es
	chksw	'p'		;see if we're supposed to pause after each
	jb	rs2
	chksw	'b'		;if we need to pause
	jb	rs8a		;ring system bell if it was requested
	write	7
rs8a:	readc			;then wait for key
	jmp	rs2
rs9:	dosf	3Eh		;close file when done
	write	7		;ring system bell when it's all completed
	eproc	rstmem

	cproc	getoff,near	;compute offset into ax for point at dx,cx
	push	cx
	push	dx
	mov	al,40
	and	dl,not 1	;mask low bit
	mul	dl		;ax has rough row offset
	pop	dx
	push	dx
	test	dl,1		;test for odd row #
	jz	go1
	add	ax,8*k		;offset to the odd rows
go1:	mov	dx,cx		;now dx has the given column #
	mov	cl,2
	cmp	byte ptr mode,6
	jne	go2
	inc	cl
go2:	shr	dx,cl		;divide column # by 4 (or 8 for high-res)
	add	ax,dx
	pop	dx
	pop	cx
	eproc	getoff

	cproc	getbyt,near
	push	ax
	push	cx
	push	dx
	mov	cx,1
	mov	dx,offset mem
	dosf	3Fh
	jb	gb1
	cmp	ax,cx
gb1:	pop	dx
	pop	cx
	pop	ax
	mov	al,mem
	eproc	getbyt

	cproc	putbyt,near
	mov	mem,al
	push	ax
	push	cx
	push	dx
	mov	cx,1
	mov	dx,offset mem
	dosf	40h
	jb	pb1
	cmp	ax,cx
pb1:	pop	dx
	pop	cx
	pop	ax
	eproc	putbyt


;mainline variables/constants

	dbvar	mem
	dbconst	rst,0  ldflg,0  vrst,0
	dwvar	xi,yi,c,ohw,ovw
	dwconst	limit,maxloop
	dwconst	hwidth,320  vwidth,200  fcnt,0
	fpconst	hundred,100.0
	fpconst	zero,0.0  one,1.0  two,2.0  four,4.0
	fpvar	x,y,a,b,m,ta,tb
	fpvar	xgap,ygap,temp,ysize,xcorner,ycorner

mbmsg   db      13,10,'Mandelbrot Microscope  Version 2.10'
        db      13,10,'Copyright by Radix 2 Software  May 1986',13,10
	db	13,10,'Suggested values in ( ), default values in [ ]',13,10
crlf    db      13,10,0
rsmsg	db	'Restore from file',0
fnmsg	db	'Enter file #: ',0
fnum	dw	?
fname	db	'MBROT.'
fnext	db	'   ',0
vname	db	'MBROT.MEM',0
fnerr	db	'File not found',13,10,13,10,0
fcerr	db	'Cannot create file',13,10,13,10,0
ovmsg	db	'File exists, overwrite',0
xcmsg	db	'X of center (-0.75): ',0
ycmsg	db	'Y of center (+0.00): ',0
xsmsg	db	'Width of window (2.5): ',0
pcmsg	db	'Percentage of screen [100%]: ',0
yxmsg	db	'Vertical/horizontal ratio [1.0]: ',0
comsg	db	'Color',0
himsg	db	'High Resolution (640x200)',0
lomsg	db	'Low Resolution (320x200)',13,10,0
resmsg	db	'Program will remain resident until completion',13,10,0

dspflg	db	0		;set to allow
xmsg	db	'X = ',0	;display of values
ymsg	db	'Y = ',0
wmsg	db	'W = ',0

filtbl	label	byte		;file data + file marker

	dbconst	mode,4 pall,1 colr,0 lmul,0
	fpvar	xcenter,ycenter,xsize,percent,yfactor
	db	13,'Requires '
	db	'Mandelbrot Microscope V2.10',13,10
	db	'By Jeff Parsons of Renton, WA  May 1986',13,10,26
	if	$-filtbl lt 128
	db	128-($-filtbl) dup (0)
	else
	if	$-filtbl gt 128
	%out	File marker constant too large
	endif
	endif

clrtbl	db	1,1,1, 2,2,2, 3,3,3, 3,2,2
	db	1,1,1, 2,2,2, 1,1,1, 2,2,2
	db	1,1,1, 2,2,2, 1,1,3, 3,3,2
	db	1,1,1, 2,2,2, 1,1,1, 2,2,2	;for counts 1-48

	db	1,1,1, 2,2,2, 1,1,1, 2,2,2
	db	1,1,1, 2,2,2, 1,1,1, 2,2,2
	db	1,1,1, 2,2,2, 1,1,3, 3,3,2
	db	1,1,1, 2,2,2, 1,1,1, 2,2,2	;for counts 49-96

	db	1,1,1, 2,2,2, 1,1,1, 2,2,2
	db	1,1,1, 2,2,2, 1,1,1, 2,2,2
	db	1,1,1, 2,2,2, 1			;for counts 97-127

	db	2,2,2, 3,3,1, 2,2,2, 3,3,1
	db	2,2,2, 3,3,1, 2,2,2, 3,3,1
	db	2,2,2, 3,3,1, 2,2,2, 3,3,1
	db	2,2,2, 3,3,1, 2,2,2, 3,3,1	;for counts 128-175

	db	2,2,2, 3,3,1, 2,2,2, 3,3,1
	db	2,2,2, 3,3,1, 2,2,2, 3,3,1
	db	2,2,2, 3,3,1, 2			;for counts 176-206

	db	3,3,3, 2,2,2, 3,3,3, 2,2,2
	db	3,3,3, 2,2,2, 3,3,3, 2,2,2
	db	3,3,3, 2,2,2, 3,3,3, 2,2,2
	db	3,3,3, 2,2,2, 3,3,3, 2,2,2, 3,0	;for counts 207-255

	if	$-clrtbl ne 256
	%out	Color table incorrect size
	endif

	endseg	cseg

        end     main		;end of mainline, specifies start address

