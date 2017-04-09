	title	memory routines

	include	dmac.asm	;macros

	public	$unload
	public	end$


	defseg	cseg,zseg

        cproc   $unload,near	;unlink from memory
        push    ax
	push	cx
        push    dx
	mov     dx,ds
        dec     dx
        mov     es,dx           ;drop back to base segment
        push    es
	sub	cx,cx		;block counter
un1:	mov     ax,es		;start looking at blocks beyond us
        add     ax,es:[3]
        inc     ax
        mov     es,ax		;segment computed
        mov     al,es:[0]
        cmp     al,'M'          ;valid block?
        je	un2
	cmp	al,'Z'
	jne	un6		;not valid, so stop looking and do it
un2:	cmp     word ptr es:[1],0
        je      un3		;count if in use
	inc	cx
un3:    cmp     al,'Z'		;last block in list?
	jne	un1
	cmp	cx,1		;if internal deallocation
	jbe	un6		;only a maximum of one block allowed
	stc
	pop	es
	jmp	short un9
un6:    pop     es
	mov     word ptr es:[1],0
        mov     cx,es:[3]       ;size of base program segment
        mov     ax,ds:[2Ch]     ;address of environment segment
        dec     ax
        mov     es,ax
        inc     ax
        add     ax,es:[3]       ;this is address of next control block
        cmp     ax,dx           ;is next block the program segment?
        jne     un8
        inc     cx
        add     es:[3],cx       ;combine this memory control block with next
un8:	mov     word ptr es:[1],0
        clc
un9:	pop     dx
	pop	cx
        pop     ax
        eproc   $unload

	endseg	cseg


	defseg	zseg,memory

end$	db	0		;last byte of program

	endseg	zseg

        end                     ;end of module
