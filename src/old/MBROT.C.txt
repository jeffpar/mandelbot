/* mbrot.c  v3.11
 *
 * Original program (3.00) by Jeff Parsons  8/86
 * Original recursive algorithm by Bill Mershon  8/86
 *
 * Graphs regions in and around the Mandelbrot set,
 * as outlined in the August '85 issue of Scientific American.
 * Supports all common IBM display modes, using CGA or EGA adapters.
 *
 * Present limitations (based on features listed below):
 *	Not all options implemented
 *	Recursive algorithm not implemented
 *	Not all supported hardware configurations tested
 *	Graphics support still needs some speed optimizations
 *
 * Usage:  mbrot [graph-file] [options...]
 *	Graph-file is the name of a file to create or restore from
 *	(depending on whether the -c option is present or not);  if
 *	not given, it will be prompted for;  the graph-file need
 *	not precede the options (that is up to the user's preference).
 *	If the graph-file, when opened, is determined to be an image-
 *	library-file, then an automatic image-by-image restore is done, so
 *	options i,c,x,y,w,p,m,l would be ignored (see below for more info).
 *
 * Options (/ may be used instead of -):
 *	-h	lists program usage and options;
 *	-l	selects resident (background) operation;
 *	-ec	allows EGA display modes, in
 *		the event EGA capability is not detected;  c
 *		should either be 'c'(color) or 'm'(monochrome);
 *	-b	selects "batch" mode, under which all user-interaction
 *		is avoided;  otherwise, required values will be prompted
 *		for if not known, and the graphics-interface menu (not
 *		yet designed) made available (on completion of a graph);
 *	-n	inhibits graph display during computation, which normally
 *		occurs only when -l option selected;
 *	-kstrng	selects the colors to be used;  format of strng is
 *		<color-code><intensity-value>..., where <color-code> is
 *		B(black), b(blue), g(green), c(cyan), r(red), m(magenta),
 *		o(orange), or w(white);  <intensity-value> is a digit 1-8;
 *		the first code/value is reserved for the color of Mandelbrot
 *		points;  (example: B1u1u2g1c1r1m1o1w1 selects black for
 *		Mandelbrot points and eight other colors, repeated as needed);
 *		maximum colors allowed following Mandelbrot color: 15 +
 *		optional border color;
 *	-j#	selects color granularity (# of iterations spanned per
 *		color);  default is 1;
 *	-c	selects CREATE mode, for which the values listed
 *		below are needed (otherwise they will be prompted for);
 *		without this option, the program is in RESTORE mode,
 *		and expects to be given a graph-file to read from;
 *		note that in "batch" mode, to create to an existing file,
 *		(or to restore from a non-existent file) is a fatal error;
 *	-cu	same as -c, but is UNCONDITIONAL (ie, if graph-file exists,
 *		it will be deleted first);
 *	-ifile	specifies an image-library-file to add the image to
 *		once it has been created (or restored), which contains
 *		images stored in a format suitable for rapid video display;
 *		if not given, it will be prompted for, but it will not be
 *		required;
 *	-v	causes the program to wait for a keyboard response
 *		after restoring each frame of an image-library-file;
 *	-x#.#	specifies x (real) co-ordinate of graph center,
 *		where #.# represents any legal floating-point constant;
 *	-y#.#	specifies y (imaginary) co-ordinate of graph center;
 *	-w#.#	specifies the (real) width of the graph;
 *		the (imaginary) height will be the width * 1/ASPECT;
 *	-p#	specifies the percentage of the total screen area to be
 *		used for the graph;  default is 100%
 *	-r#.#	specifies horizontal/vertical ratio;  default is ASPECT;
 *	-g#	specifies the graphics display mode to be used:
 *		1 =  4-color Low-res  (CGA/EGA)
 *		2 =  2-color Med-res  (CGA/EGA)
 *		3 = 16-color Low-res  (EGA)
 *		4 = 16-color Med-res  (EGA)
 *		5 = 16-color 640x350  (EGA w/Enhanced Display)
 *		6 = 16-color 640x480  (EVA w/MultiSync Display)
 *		Note: since EGA colors are selected from a 64-color palette,
 *		colors appearing on an Enhanced Display may differ from
 *		those seen on a normal IRGB Color Display (unless a different
 *		coloring scheme is selected with the k option); default
 *		value depends on equipment installed;
 *	-m#	specifies the algorithm limit (defaults to 250, usual
 *		limits are 100 to 64k);
 *	-f#	forces the data storage format # (defaults to COMPACT);
 *	-s	specifies "sequential" (or standard iterative) algorithm;
 *		if omitted, then the *new* recursive algorithm will be used
 *		(which analyzes borders of successive block-divisions of the
 *		screen);  the output using either method should be identical;
 *
 * Errorlevels (currently):
 *	1. Signal abort
 *	2. File open/create error
 *
 * Examples:
 *	mbrot mbrot.1 -c -x -1.25 -y0 -w2.5 -i mbrot.mem
 */


/*** Include files ***/

#define	LINT_ARGS  1		/* enable argument checking */

#include <dos.h>
#include <conio.h>
#include <io.h>
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <signal.h>
#include <string.h>


/*** Manifest constants ***/

#define	TRUE	1
#define	FALSE	0
#define	NONE	-1
#define	ASPECT	1.43		/* a default value */
#define	MAXPOINTS 65536/sizeof(int)
#define	MSOFT_METHOD   -1
#define	OLD_METHOD	0	/* method codes stored in graph-files */
#define	COMPACT_METHOD	1
#define	RANGE_METHOD	2	/* includes range of values in header as well */
#define	KNOWN_METHOD	2

#define	ESCAPE	27		/* popular ascii codes */

#define	MOUSE		0x01
#define	RIGHTBUTTON	0x02
#define	LEFTBUTTON	0x04	/* our mouse status bit definitions */

#define	MOUSE_EXIT	1	/* our mouse-routine return codes */

#define	BOX_MODE	1
#define	EDIT_MODE	2
#define	RIPPLEUP_MODE	3
#define	RIPPLEDN_MODE	4
#define	SRIPPLE_MODE	5
#define	FIRST_MODE	BOX_MODE
#define	LAST_MODE	SRIPPLE_MODE

#define	BLINK_DELAY	5	/* in tenths of a second */
#define	INITIAL_DELAY	15


/*** New type identifiers ***/

typedef	unsigned Word;
typedef	unsigned char Byte;
typedef	unsigned long Dword;


/*** Global constants ***/

char	*title  = "Mandelbrot Microscope\n";
char	*ver    = "Version 3.11 by Jeff Parsons  March, 1987\n";

double	zero = 0.0;


/*** Global inputs/calculations ***/

double	xcenter = -0.75,	/* (x,y) co-ordinates of graph center */
	ycenter = 0.0,
	xsize = 3.25,		/* width of image, along x (real) axis */
	percentage = 100.0,	/* percentage of screen area to use */
	oldpercentage,
	yfactor = 1.0/ASPECT;	/* ysize will be (xsize * yfactor)
				   to compensate for rectangular screen */
unsigned graphmode = 1,		/* see list of graph mode #'s above */
	 oldgraphmode,		/* saved by prep_graph */
	 desiredmode = 0,
	 maxcount = 250,
	 colorjump = 0,
	 uniquecolors = 15,
	 mouse = 0,		/* bits 1&2(+3&4) are right&left buttons */
	 mousemode = BOX_MODE,
	 hmousepos, vmousepos,
	 hboxpos, vboxpos,	/* all positions are relative to 1 */
	 hboxend = 0, vboxend = 0,
	 minvalue = 0xffff, maxvalue = 0;

Byte	boxarray[640*2+480*2];	/* enough room for biggest possible box */

Byte	cgapalette = 0,		/* palette code (for CGA modes only) */
	cgaborder = 0,		/* CGA border (or 1-color graphics color) */
	editcolor = 0,		/* non-zero if color being edited */
	blinkcolor = 0,
	blinkstate = 0;

char	*colorlist = NULL,	/* pointer set to color-list, if any */
	graphname[80] = "",	/* graph-file name */
	imagename[80] = "";	/* image-library-file name */

Byte	egamode = 0,		/* 1=color, 2=enhanced, 3=monochrome, 4=eva */
	egasize = 0,		/* # of 64k chunks installed */
	egabits = 0,		/* ega feature bits */
	egasets = 0;		/* ega switch settings */
char	method = KNOWN_METHOD;

int	oldmode = NONE;		/* mode to restore upon program termination */

int	vwidth, vheight,	/* width & height of screen in pixels */
	hsize, vsize,		/* width & height of image on screen */
	rheight, rsize,		/* real vertical dimensions */
	hoffset, voffset,
	duptotal = 0,
	dupvalue = 0,
	scantotal = 0,		/* values kept for compact data expansion */
	comptotal = 0,
	compvalue = 0;		/* values kept for file compression */

long	comppos,		/* if compressing, file position */
	tablepos,
	minmaxpos;
Dword	starttime;		/* external for mark_time, elapsed_time */
Word	blinkdelay,
	ripplepoint;

double	ysize,			/* height of image (see yfactor) */
	xgap, ygap;		/* x and y deltas from point to point */


/*** Other Global data ***/

FILE	*graphfile = NULL,
	*imagefile = NULL;

int	vtable[6] = {0x04, 0x06, 0x0D, 0x0E, 0x10, 0x25};
int	utable[5] = {4, 2, 16, 16, 16};
char	ktable[8] = {'B', 'b', 'g', 'c', 'r', 'm', 'o', 'w'};
Byte	otable[17];
Byte	ptable[17] = {0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x14, 0x07,
		      0x38, 0x39, 0x3A, 0x3B, 0x3C, 0x3D, 0x3E, 0x3F, 0};

unsigned *screen = NULL;	/* pixel matrix pointer (array of points) */

struct {unsigned title : 1;
	unsigned error : 1;
	unsigned help : 1;
	unsigned debug : 1;
	unsigned ega : 1;
	unsigned batch : 1;
	unsigned nodisp : 1;
	unsigned alternate : 1;
	unsigned time : 1;
	unsigned create : 1;
	unsigned ucreate : 1;
	unsigned std : 1;
	unsigned pause : 1;
	unsigned x : 1;
	unsigned y : 1;
	unsigned size : 1;
	unsigned count : 1;
	unsigned percent : 1;
	unsigned ratio : 1;
	unsigned mode : 1;
	unsigned method : 1;
	unsigned compact : 1;
	unsigned dirty : 1;
	unsigned critical : 1;
	unsigned color : 1;
	} flags;


/*** Forward declarations ***/

void	do_title(void);
void	sig_handler(void);
int	video_mode(void);
void	get_ega(void);
void	set_video(int);
void	set_palette(Byte *);
void	display_type(void);

void	init_mouse(void);
void	show_mouse(void);
void	hide_mouse(void);
int	process_events(void);
Dword	get_time(void);
void	mark_time(void);
Word	elapsed_time(void);
void	enable_color(Byte);
void	disable_color(Byte);
void	rippleup_palette(void);
void	rippledn_palette(void);
void	update_palette(void);
int	mouse_movement(void);
int	mouse_moved(void);
int	mouse_leftdown(void);
int	mouse_leftup(void);
int	mouse_rightdown(void);
int	mouse_rightup(void);
void	define_mouseptr(unsigned);
int	draw_box(Byte, Byte);
void	draw_point(int, int, int *, Byte);

void	get_unknowns(void);
void	parse_colors(char *);
void	open_graph(void);
void	read_header(void);
void	write_header(void);

void	prep_graph(void);
unsigned get_count(void);
void	put_count(unsigned);
void	do_graph(void);
void	write_point(unsigned, unsigned, int);
Byte	read_dot(unsigned, unsigned);
void	write_dot(unsigned, unsigned, Byte);

void	get_switches(int, char **);
void	help(void);
void	clr_kbd(void);
void	press_key(void);
char	inp_char(void);
int	inp_line(char *, double *);


void main(argc, argv, envp)
int	argc;
char	**argv, **envp;
{
	signal(SIGINT, sig_handler);	/* trap ctrl-c/break */
	get_switches(--argc, ++argv);
	display_type();			/* determine type of display */
	if (!flags.batch)
		get_unknowns();		/* get any unspecified variables */
	else if (graphname[0])
		open_graph();		/* try open even if batch */
	if (colorlist)
		parse_colors(colorlist);
	prep_graph();			/* get video parameters for graph */
	while (TRUE) {
		if (flags.create && graphfile)	/* save info in file, if any */
			write_header();
		if (!flags.nodisp) {
			flags.dirty = FALSE;
			set_video(vtable[graphmode-1]);
			/*if (colorlist)*/
				set_palette(ptable);
		}
		while (TRUE) {
			do_graph();		/* start graphing */
			if (flags.create) {
				if (minmaxpos) {
					comppos = ftell(graphfile);
					fseek(graphfile, minmaxpos, SEEK_SET);
					fwrite((char *)&minvalue, sizeof(minvalue), 1, graphfile);
					fwrite((char *)&maxvalue, sizeof(maxvalue), 1, graphfile);
					fseek(graphfile, comppos, SEEK_SET);
				}
			}
			else if (graphfile) {
				getc(graphfile);
				if (!feof(graphfile)) {
					fseek(graphfile, -1l, SEEK_CUR);
					flags.dirty = TRUE;
					method = KNOWN_METHOD;
					read_header();
					continue;
				}
				else {
					flags.create = TRUE;
					clearerr(graphfile);
					fseek(graphfile, 0l, SEEK_CUR);
				}
			}
			break;
		}
		if (!flags.nodisp) {
			init_mouse();
			clr_kbd();
			if (!process_events()) {
				set_video(oldmode);
				break;
			}
		}
		else
			break;		/* if not displaying, kick out of loop */
	}
	if (graphfile) {
		if (flags.compact)
			chsize(fileno(graphfile), comppos);
		fclose(graphfile);
	}
	exit(0);			/* then normal exit */
}


void do_title()
{
	if (!flags.title) {
		printf("%s%s\n", title, ver);
		flags.title = TRUE;
	}
}


void sig_handler()
{
	if (flags.critical)
		signal(SIGINT, sig_handler);
	else {
		if (oldmode != NONE && oldmode != video_mode())
			set_video(oldmode);
		if (graphfile) {
			if (flags.compact)
				chsize(fileno(graphfile), comppos);
			fclose(graphfile);
		}
		if (imagefile)
			fclose(imagefile);
		_exit(1);
	}
}


int video_mode()
{
	union REGS regs;

	regs.h.ah = 0x0F;	/* video function 0F: get video state */
	int86(0x10, &regs, &regs);
	return(regs.h.al);
}


void get_ega()
{
	union REGS regs;
	char far *romaddr;
	register int i;
	char romstring[6];

	regs.h.ah = 0x12;	/* video function 12: alternate fn select */
	regs.h.bl = 0x10;	/* # to request ega info */
	int86(0x10, &regs, &regs);
	if (regs.h.bl <= 3 && regs.h.bh <= 1) {
		egamode = ++regs.h.bh;	/* return ega info */
		egasize = ++regs.h.bl;	/* in global calculation area */
		egabits = regs.h.ch;
		egasets = regs.h.cl;
	}
	else if (flags.ega) {	/* egamode explicitly specified */
		egasize = 1;
		egabits = 0x0F;
		if (egamode == 1)
			egasets = 0x07;
		else
			egasets = 0x0B;
	}
	if (egamode == 1 && (egasets == 0x08 || egasets == 0x09) ||
	    egamode == 2)
		egamode++;	/* adjust egamode to value from 1 to 3 */
	if (egamode) {
		romaddr = (char far *)0xC0000076l;
		for (i=0; i<=4; i++)
			romstring[i] = *romaddr++;
		romstring[5] = '\0';
		if (!strcmp(romstring, "Tseng"))
			egamode += 2;
	}
	if (!flags.mode)
		if (egamode == 1)	/* ega but with rgb monitor */
			graphmode = 4;
		else
		if (egamode >= 2 && egamode <= 3)
			graphmode = 5;	/* enhanced color supports 640x350 */
		else {
			graphmode = 6;	/* Tseng Eva/480 board sports 640x480 */
			yfactor = 0.75;	/* square pixel, so ratio exactly 480/640 */
		}
}


void set_video(newmode)
int	newmode;
{
	union REGS regs;

	regs.x.ax = newmode;	/* video function 00: set video mode */
	int86(0x10, &regs, &regs);
}


void set_palette(p)
Byte p[];
{
	union REGS regs;
	struct SREGS sregs;
	Byte far *fp = (Byte far *)p;

	if (egamode) {		/* video function 10/02: set all colors */
		regs.x.ax = 0x1002;
		regs.x.dx = FP_OFF(fp);
		sregs.es = FP_SEG(fp);
		int86x(0x10, &regs, &regs, &sregs);
	}
}


void display_type()
{
	register char *p;

	oldmode = video_mode();
	get_ega();
	if (!flags.batch) {
		if (!egamode)
			if (oldmode == 7)
				p = "Monochrome";
			else
				p = "Color w/CGA";
		else if (egamode == 1)
			p = "Color w/EGA";
		else if (egamode == 2)
			p = "Enhanced Color";
		else if (egamode == 3)
			p = "Monochrome w/EGA";
		else if (egamode >= 4 && egamode <= 5)
			p = "MultiSync w/EVA";
		else {
			p = "Unknown [ ]";
			*(p+9) = (char)('0'+egamode);
		}
		do_title();
		printf("Display type: %s", p);
		if (egamode)
			printf(" (%dk)", egasize*64);
		printf("\n\n");
	}
}


void init_mouse()
{
	union REGS regs;
	Dword far *p = (Dword far *)(0x33*4);

	if (!*p)
		return;		/* no mouse vector address */
	regs.x.ax = 0;
	int86(0x33, &regs, &regs);
	if (!regs.x.ax)		/* no mouse driver */
		return;
	mouse = MOUSE;		/* assume exists for now */
	regs.x.ax = 7;		/* set min/max horizontal positions */
	regs.x.cx = hoffset;
	regs.x.dx = hoffset+(hsize-3);
	int86(0x33, &regs, &regs);
	regs.x.ax = 8;		/* set min/max vertical position */
	regs.x.cx = voffset;
	regs.x.dx = voffset+(rsize-3);
	int86(0x33, &regs, &regs);
	/*regs.x.ax = 4;*/	/* set mouse position */
	/*hmousepos = hsize/2;*/
	/*vmousepos = rsize/2;*/
	/*regs.x.cx = hmousepos++ + hoffset;*/
	/*regs.x.dx = vmousepos++ + voffset;*/
	/*int86(0x33, &regs, &regs);*/
	define_mouseptr(mousemode);
	show_mouse();
}


void show_mouse()
{
	union REGS regs;

	regs.x.ax = 1;		/* show mouse pointer now */
	int86(0x33, &regs, &regs);
}


void hide_mouse()
{
	union REGS regs;

	regs.x.ax = 2;		/* hide mouse pointer now */
	int86(0x33, &regs, &regs);
}


int process_events()
{
	register int c;
	union REGS regs;

	while (TRUE) {
		while (kbhit()) {
			if ((c=getch()) == ESCAPE) {
				update_palette();
				return(FALSE);	/* time to exit program */
			}
		}
		if (editcolor && mousemode != EDIT_MODE)
			editcolor = 0;
		if (editcolor != blinkcolor)	/* if new editcolor, clear old */
			if (blinkcolor) {	/* if first editcolor, nothing to do */
				enable_color(blinkcolor);
				blinkcolor = 0;
				blinkstate = 0;
			}
		if (editcolor) {		/* twiddle color if 1st time, or delay expired */
			if (!blinkcolor || elapsed_time() >= blinkdelay) {
				blinkcolor = editcolor;
				if (!blinkstate || (mouse & LEFTBUTTON)) {
					blinkstate = TRUE;
					enable_color(blinkcolor);
				}
				else {
					blinkstate = FALSE;
					disable_color(blinkcolor);
					blinkdelay = BLINK_DELAY;
				}
				mark_time();
			}
		}
		if (mousemode == RIPPLEUP_MODE)
			rippleup_palette();
		if (mousemode == RIPPLEDN_MODE)
			rippledn_palette();
		if (mouse) {
			regs.x.ax = 3;		/* get mouse position */
			int86(0x33, &regs, &regs);
			c = regs.x.bx;		/* button status */
			regs.x.cx -= (hoffset-1);
			regs.x.dx -= (voffset-1);
			if (regs.x.cx != hmousepos || regs.x.dx != vmousepos) {
				hmousepos = regs.x.cx;
				vmousepos = regs.x.dx;
				mouse_moved();
			}
			if (c & 0x01) {
				mouse |= LEFTBUTTON;
				if (!(mouse & (LEFTBUTTON<<2))) {
					mouse |= (LEFTBUTTON<<2);
					if (mouse_leftdown() == MOUSE_EXIT)
						return(TRUE);
				}
			}
			else {
				mouse &= ~LEFTBUTTON;
				if (mouse & (LEFTBUTTON<<2)) {
					mouse &= ~(LEFTBUTTON<<2);
					mouse_leftup();
				}
			}
			if (c & 0x02) {
				mouse |= RIGHTBUTTON;
				if (!(mouse & (RIGHTBUTTON<<2))) {
					mouse |= (RIGHTBUTTON<<2);
					 mouse_rightdown();
				}
			}
			else {
				mouse &= ~RIGHTBUTTON;
				if (mouse & (RIGHTBUTTON<<2)) {
					mouse &= ~(RIGHTBUTTON<<2);
					mouse_rightup();
				}
			}
		}
	}
}


Dword get_time()	/* returns # tenths of seconds since midnight */
{
	union REGS regs;

	regs.h.ah = 0x2C;	/* dos time function */
	int86(0x21, &regs, &regs);
	return(regs.h.ch*36000l+regs.h.cl*600+regs.h.dh*10+(regs.h.dl+5)/10);
}


void mark_time()
{
	starttime = get_time();
}


Word elapsed_time()
{
	return((Word)(get_time() - starttime));
}


void enable_color(c)
Byte c;
{
	set_palette(ptable);
}


void disable_color(c)
Byte c;
{
	register int i;
	Byte dtable[17];

	for (i=0; i<17; i++)
		dtable[i] = ptable[i];
	dtable[c] = 0;
	set_palette(dtable);
}


void rippleup_palette()
{
	register int i;
	register Byte c;

	if (ripplepoint) {
		c = ptable[15];
		for (i=15; i>ripplepoint; i--) {
			ptable[i] = ptable[i-1];

		}
		ptable[ripplepoint] = c;
		set_palette(ptable);
	}
}


void rippledn_palette()
{
	register int i;
	register Byte c;

	if (ripplepoint) {
		c = ptable[ripplepoint];
		for (i=ripplepoint; i<15; i++) {
			ptable[i] = ptable[i+1];

		}
		ptable[15] = c;
		set_palette(ptable);
	}
}


void update_palette()
{
	register int i;

	for (i=0; i<17; i++)
		if (ptable[i] != otable[i])
			break;
	if (graphfile && method != MSOFT_METHOD && i < 17) {
		fseek(graphfile, tablepos, SEEK_SET);
		fwrite((char *)ptable, sizeof(ptable), 1, graphfile);
	}
}


int mouse_movement()
{
	union REGS regs;

	regs.x.ax = 3;		/* check mouse position */
	int86(0x33, &regs, &regs);
	regs.x.cx -= (hoffset-1);
	regs.x.dx -= (voffset-1);
	if (regs.x.bx & 0x01)	/* if left button still down */
		if (regs.x.cx != hmousepos || regs.x.dx != vmousepos)
			return(TRUE);
	return(FALSE);
}


int mouse_moved()
{
	if (mousemode == BOX_MODE) {
		if (mouse & LEFTBUTTON) {	/* if left button still down */
			draw_box(FALSE, 4);	/* erase any previous box */
			hboxend = hmousepos;
			vboxend = vmousepos;	/* define endpoints as new position */
			if (abs(hboxend-hboxpos) < 2)
				if (hboxend >= hboxpos)
					hboxend = hboxpos + 2;
				else
					hboxend = hboxpos - 2;
			if (abs(vboxend-vboxpos) < 2)
				if (vboxend >= vboxpos)
					vboxend = vboxpos + 2;
				else
					vboxend = vboxpos - 2;
			draw_box(TRUE, 4);	/* redraw a box */
		}
	}
	return(0);
}


int mouse_leftdown()
{
	register Byte c, d;
	int newsize, newcenter;

	if (mousemode == EDIT_MODE) {
		if (c = read_dot(hmousepos, vmousepos)) {
			if (c == editcolor) {
				d = ptable[c] + 0010;
				if (d >= 0100)
					d = (d + 0001) & 0077;
				ptable[c] = d;
				set_palette(ptable);
			}
			else
				editcolor = c;
			mark_time();
			blinkdelay = INITIAL_DELAY;
		}
	}
	else if (mousemode == RIPPLEUP_MODE) {
		if (ripplepoint)
			mousemode = RIPPLEDN_MODE;
		else
			ripplepoint = read_dot(hmousepos, vmousepos);
	}
	else if (mousemode == RIPPLEDN_MODE) {
		if (ripplepoint)
			mousemode = RIPPLEUP_MODE;
		else
			ripplepoint = read_dot(hmousepos, vmousepos);
	}
	else if (mousemode == SRIPPLE_MODE) {
		ripplepoint = read_dot(hmousepos, vmousepos);
		rippleup_palette();
	}
	if (mousemode != BOX_MODE)	/* rest of code for boxes */
		return(0);
	if (hboxend && vboxend)		/* if there's a box... */
	if (hmousepos > hboxpos && hmousepos < hboxend ||	/* and we're */
	    hmousepos < hboxpos && hmousepos > hboxend)		/* inside it... */
		if (vmousepos > vboxpos && vmousepos < vboxend ||
		    vmousepos < vboxpos && vmousepos > vboxend) {
			newsize = abs(hboxend-hboxpos);
			if (hboxpos <= hboxend)
				newcenter = hboxpos + newsize/2;
			else
				newcenter = hboxend + newsize/2;
			xcenter += (newcenter - hsize/2) * xgap;
			newsize = abs(vboxend-vboxpos);
			if (vboxpos <= vboxend)
				newcenter = vboxpos + newsize/2;
			else
				newcenter = vboxend + newsize/2;
			ycenter += (vsize/2 - newcenter) * ygap;
			xsize = (xsize * abs(hboxend-hboxpos)) / hsize;
			hboxend = 0;
			vboxend = 0;
			minvalue = 0xffff;
			maxvalue = 0;
			return(MOUSE_EXIT);
		}
	c = (Byte)draw_box(FALSE, 4);	/* if box was successfully erased */
	hboxend = 0;			/* then we just get rid of it */
	vboxend = 0;
	hboxpos = hmousepos;		/* denoted by nonzero endpoints */
	vboxpos = vmousepos;		/* then record new beginpoints (upper-left) */
	if (c)
		return(0);
	else
		return(mouse_moved());
}


int mouse_leftup()
{
	return(0);
}


int mouse_rightdown()
{
	register Byte c, d;

	if (mousemode == EDIT_MODE && (mouse & LEFTBUTTON)) {
		if (c = read_dot(hmousepos, vmousepos)) {
			if (c == editcolor) {
				d = ptable[c] - 0010;
				if (d == 0)
					d = 077;
				if (d >= 0100)
					d = (d - 0001) & 0077;
				ptable[c] = d;
				set_palette(ptable);
			}
			else
				editcolor = c;
			mark_time();
			blinkdelay = INITIAL_DELAY;
		}
		return(0);
	}
	if (++mousemode > LAST_MODE)
		mousemode = FIRST_MODE;
	if (mousemode == RIPPLEDN_MODE)
		mousemode++;
	ripplepoint = 0;
	define_mouseptr(mousemode);
	return(0);
}


int mouse_rightup()
{
	return(0);
}


void define_mouseptr(mousemode)
unsigned mousemode;
{
	union REGS regs;
	struct SREGS sregs;
	Word far *fp = NULL;
	register Word hoth, hotv;
	static Word boxmouse[]  = {0xFFFF,  /* 1111111111111111 */
				   0x9FFF,  /* 1001111111111111 */
				   0x8FFF,  /* 1000111111111111 */
				   0x87FF,  /* 1000011111111111 */
				   0x83FF,  /* 1000001111111111 */
				   0x81FF,  /* 1000000111111111 */
				   0x80FF,  /* 1000000011111111 */
				   0x807F,  /* 1000000001111111 */
				   0x803F,  /* 1000000000111111 */
				   0x801F,  /* 1000000000011111 */
				   0x800F,  /* 1000000000001111 */
				   0x887F,  /* 1000100001111111 */
				   0x987F,  /* 1001100001111111 */
				   0xFC3F,  /* 1111110000111111 */
				   0xFC3F,  /* 1111110000111111 */
				   0xFE3F,  /* 1111111000111111 */

				   0x0000,  /* 0000000000000000 */
				   0x0000,  /* 0000000000000000 */
				   0x2000,  /* 0010000000000000 */
				   0x3000,  /* 0011000000000000 */
				   0x3800,  /* 0011100000000000 */
				   0x3C00,  /* 0011110000000000 */
				   0x3E00,  /* 0011111000000000 */
				   0x3F00,  /* 0011111100000000 */
				   0x3F80,  /* 0011111110000000 */
				   0x3FC0,  /* 0011111111000000 */
				   0x3600,  /* 0011011000000000 */
				   0x2300,  /* 0010001100000000 */
				   0x0300,  /* 0000001100000000 */
				   0x0180,  /* 0000000110000000 */
				   0x0180,  /* 0000000110000000 */
				   0x0000}; /* 0000000000000000 */

	static Word editmouse[] = {0xFFFF,  /* 1111111111111111 */
				   0xFFF9,  /* 1111111111111001 */
				   0xFFF1,  /* 1111111111110001 */
				   0xFFE1,  /* 1111111111100001 */
				   0xFFC1,  /* 1111111111000001 */
				   0xFF81,  /* 1111111110000001 */
				   0xFF01,  /* 1111111100000001 */
				   0xFE01,  /* 1111111000000001 */
				   0xFC01,  /* 1111110000000001 */
				   0xF801,  /* 1111100000000001 */
				   0xF001,  /* 1111000000000001 */
				   0xFE11,  /* 1111111000010001 */
				   0xFE19,  /* 1111111000011001 */
				   0xFC3F,  /* 1111110000111111 */
				   0xFC3F,  /* 1111110000111111 */
				   0xFC7F,  /* 1111110001111111 */

				   0x0000,  /* 0000000000000000 */
				   0x0000,  /* 0000000000000000 */
				   0x0004,  /* 0000000000000100 */
				   0x000C,  /* 0000000000001100 */
				   0x001C,  /* 0000000000011100 */
				   0x003C,  /* 0000000000111100 */
				   0x007C,  /* 0000000001111100 */
				   0x00FC,  /* 0000000011111100 */
				   0x01FC,  /* 0000000111111100 */
				   0x03FC,  /* 0000001111111100 */
				   0x006C,  /* 0000000001101100 */
				   0x00C4,  /* 0000000011000100 */
				   0x00C0,  /* 0000000011000000 */
				   0x0180,  /* 0000000110000000 */
				   0x0180,  /* 0000000110000000 */
				   0x0000}; /* 0000000000000000 */

	static Word ripmouse[] =  {0xFE3F,  /* 1111111000111111 */
				   0xFC3F,  /* 1111110000111111 */
				   0xFC3F,  /* 1111110000111111 */
				   0x987F,  /* 1001100001111111 */
				   0x887F,  /* 1000100001111111 */
				   0x800F,  /* 1000000000001111 */
				   0x801F,  /* 1000000000011111 */
				   0x803F,  /* 1000000000111111 */
				   0x807F,  /* 1000000001111111 */
				   0x80FF,  /* 1000000011111111 */
				   0x81FF,  /* 1000000111111111 */
				   0x83FF,  /* 1000001111111111 */
				   0x87FF,  /* 1000011111111111 */
				   0x8FFF,  /* 1000111111111111 */
				   0x9FFF,  /* 1001111111111111 */
				   0xFFFF,  /* 1111111111111111 */

				   0x0000,  /* 0000000000000000 */
				   0x0180,  /* 0000000110000000 */
				   0x0180,  /* 0000000110000000 */
				   0x0300,  /* 0000001100000000 */
				   0x2300,  /* 0010001100000000 */
				   0x3600,  /* 0011011000000000 */
				   0x3FC0,  /* 0011111111000000 */
				   0x3F80,  /* 0011111110000000 */
				   0x3F00,  /* 0011111100000000 */
				   0x3E00,  /* 0011111000000000 */
				   0x3C00,  /* 0011110000000000 */
				   0x3800,  /* 0011100000000000 */
				   0x3000,  /* 0011000000000000 */
				   0x2000,  /* 0010000000000000 */
				   0x0000,  /* 0000000000000000 */
				   0x0000}; /* 0000000000000000 */

	static Word sripmouse[] = {0xFC7F,  /* 1111110001111111 */
				   0xFC3F,  /* 1111110000111111 */
				   0xFC3F,  /* 1111110000111111 */
				   0xFE19,  /* 1111111000011001 */
				   0xFE11,  /* 1111111000010001 */
				   0xF001,  /* 1111000000000001 */
				   0xF801,  /* 1111100000000001 */
				   0xFC01,  /* 1111110000000001 */
				   0xFE01,  /* 1111111000000001 */
				   0xFF01,  /* 1111111100000001 */
				   0xFF81,  /* 1111111110000001 */
				   0xFFC1,  /* 1111111111000001 */
				   0xFFE1,  /* 1111111111100001 */
				   0xFFF1,  /* 1111111111110001 */
				   0xFFF9,  /* 1111111111111001 */
				   0xFFFF,  /* 1111111111111111 */

				   0x0000,  /* 0000000000000000 */
				   0x0180,  /* 0000000110000000 */
				   0x0180,  /* 0000000110000000 */
				   0x00C0,  /* 0000000011000000 */
				   0x00C4,  /* 0000000011000100 */
				   0x006C,  /* 0000000001101100 */
				   0x03FC,  /* 0000001111111100 */
				   0x01FC,  /* 0000000111111100 */
				   0x00FC,  /* 0000000011111100 */
				   0x007C,  /* 0000000001111100 */
				   0x003C,  /* 0000000000111100 */
				   0x001C,  /* 0000000000011100 */
				   0x000C,  /* 0000000000001100 */
				   0x0004,  /* 0000000000000100 */
				   0x0000,  /* 0000000000000000 */
				   0x0000}; /* 0000000000000000 */

	if (mousemode == BOX_MODE) {
		fp = (Word far *)boxmouse;
		hoth = 0;
		hotv = 0;
	}
	else if (mousemode == EDIT_MODE) {
		fp = (Word far *)editmouse;
		hoth = 15;
		hotv = 0;
	}
	else if (mousemode == RIPPLEUP_MODE || mousemode == RIPPLEDN_MODE) {
		fp = (Word far *)ripmouse;
		hoth = 0;
		hotv = 15;
	}
	else {
		fp = (Word far *)sripmouse;
		hoth = 15;
		hotv = 15;
	}
	if (fp) {
		regs.x.ax = 9;		/* set cursor block */
		regs.x.bx = hoth;	/* hot spot (horizontal) */
		regs.x.cx = hotv;	/* hot spot (vertical) */
		regs.x.dx = FP_OFF(fp);
		sregs.es  = FP_SEG(fp);
		int86x(0x33, &regs, &regs, &sregs);
		show_mouse();
	}
}


int draw_box(draw, sides)
Byte draw, sides;
{
	int b=0;
	register int xi, yi;

	if (!draw)
		if (hboxend == 0 || vboxend == 0)
			return(FALSE);
	hide_mouse();
	if (hboxpos <= hboxend)
		for (xi=hboxpos,yi=vboxpos; xi<=hboxend; xi++)
			draw_point(xi, yi, &b, draw);
	else
		for (xi=hboxpos,yi=vboxpos; xi>=hboxend; xi--)
			draw_point(xi, yi, &b, draw);
	if (!--sides) {
		hboxend = 0;
		goto end;
	}
	if (draw && mouse_movement()) {
		draw_box(FALSE, 1);
		goto end;
	}
	if (vboxpos <= vboxend)
		for (xi=hboxend,yi=vboxpos+1; yi<=vboxend; yi++)
			draw_point(xi, yi, &b, draw);
	else
		for (xi=hboxend,yi=vboxpos-1; yi>=vboxend; yi--)
			draw_point(xi, yi, &b, draw);
	if (!--sides) {
		hboxend = 0;
		goto end;
	}
	if (draw && mouse_movement()) {
		draw_box(FALSE, 2);
		goto end;
	}
	if (hboxpos <= hboxend)
		for (xi=hboxend-1,yi=vboxend; xi>=hboxpos; xi--)
			draw_point(xi, yi, &b, draw);
	else
		for (xi=hboxend+1,yi=vboxend; xi<=hboxpos; xi++)
			draw_point(xi, yi, &b, draw);
	if (!--sides) {
		hboxend = 0;
		goto end;
	}
	if (draw && mouse_movement()) {
		draw_box(FALSE, 3);
		goto end;
	}
	if (vboxpos <= vboxend)
		for (xi=hboxpos,yi=vboxend-1; yi>vboxpos; yi--)
			draw_point(xi, yi, &b, draw);
	else
		for (xi=hboxpos,yi=vboxend+1; yi<vboxpos; yi++)
			draw_point(xi, yi, &b, draw);
end:
	show_mouse();
	return(TRUE);
}


void draw_point(xi, yi, b, draw)
register int xi, yi;
int *b;
Byte draw;
{
	if (!draw)
		write_dot(xi, yi, boxarray[(*b)++]);
	else if ((boxarray[(*b)++] = read_dot(xi, yi)) == 0x0f)
		write_dot(xi, yi, 0x00);
	else
		write_dot(xi, yi, 0x0f);
}


void get_unknowns()
{
	while (!graphfile) {
		if (!graphname[0]) {
			printf("Name of graph-file: ");
			if (inp_line("%79s", (double *)graphname) != 1) {
				putchar('\n');
				break;
			}
		}
		open_graph();
	}
	if (!flags.x) {		/* if xcenter not given as switch... */
		printf("X of center: ");
		flags.x = inp_line("%lf", &xcenter)==1;
	}
	if (!flags.y) {		/* similarly, if ycenter not known... */
		printf("Y of center: ");
		flags.y = inp_line("%lf", &ycenter)==1;
	}
	while (!flags.size) {	/* similarly, if xsize has not been set... */
		printf("Width of window: ");
		if (!(flags.size = inp_line("%lf", &xsize)==1))
			break;
		else if (xsize < zero)
			flags.size = FALSE;
	}
	while (!flags.count) {
		printf("Max iterations [%u]: ", maxcount);
		if (!(flags.count = inp_line("%u", (double *)&maxcount)==1))
			break;
		else if (maxcount == 0)
			flags.size = FALSE;
	}
	while (!flags.percent) {
		printf("Percentage of screen [%.0lf]: ", percentage);
		if (!(flags.percent = inp_line("%lf", &percentage)==1))
			break;
		else if (percentage <= zero || percentage > 100.0)
			flags.percent = FALSE;
	}
	while (!flags.ratio) {
		printf("Aspect ratio [%.2f]: ", 1.0/yfactor);
		if (!(flags.ratio = inp_line("%lf", &yfactor)==1))
			break;
		else if (yfactor < 1.0)
			flags.ratio = FALSE;
		else
			yfactor = 1.0/yfactor;
	}
	while (!flags.mode) {
		printf("\n\
Display modes supported....\n\
  1.  4-color Low-res (CGA/EGA)\n\
  2.  2-color Med-res (CGA/EGA)\n\
  3. 16-color Low-res (EGA)\n\
  4. 16-color Med-res (EGA)\n\
  5. 16-color 640x350 (EGA+Enhanced)\n\
  6. 16-color 640x480 (EVA+MultiSync)\n\
Select one of these display modes [%u]: ", graphmode);
		if (!(flags.mode = inp_line("%u", (double *)&graphmode)==1))
			break;
		else if (graphmode == 0 || graphmode > 6)
			flags.mode = FALSE;
	}
}


void parse_colors(s)
char *s;
{
	Byte error = FALSE;
	register int p, p2, i;

	p = 0;
	while (*s && p <= 16) {
		for (i=0; i<8; i++)
			if (*s == ktable[i])
				break;
		if (i == 8) {
			error = TRUE;
			break;
		}
		s++;
		if (*s < '1' || *s > '8') {
			error = TRUE;
			break;
		}
		i += (*s++ - '1')*8;	/* palette code assembled now */
		if (graphmode == 5 && egasize == 1) {
			if (p <= 3) {
				switch (p) {
				case 0:
					p2 = 0;
					break;
				case 1:
					p2 = 1;
					break;
				case 2:
					p2 = 4;
					break;
				case 3:
					p2 = 5;
					break;
				}
				ptable[p2] = ptable[p2+2] =
				ptable[p2+8] = ptable[p2+10] = (Byte)i;
			}
			else if (p == 16)
				ptable[p] = (Byte)i;
		}
		else
			ptable[p] = (Byte)i;
		p++;
	}
	if (error) {
		do_title();
		fprintf(stderr, "Bad color code: %c\n", *s);
		press_key();
	}
	else if (p)
		uniquecolors = --p;
}


void open_graph()
{
	char str[80];
	register unsigned i, j;

	strupr(graphname);
	if (flags.create) {
		if (flags.ucreate) {
			if (!(graphfile=fopen(graphname, "wb"))) {
				flags.ucreate = FALSE;
				fprintf(stderr, "Cannot create file %s",
					graphname);
				if (flags.batch)
					_exit(2);
				fprintf(stderr, "\n\n");
				graphname[0] = '\0';
			}
			else
				fprintf(graphfile, "Requires %s%s\x1A",
					title, ver);
		}
		else {
			if (graphfile=fopen(graphname, "rb")) {
				fclose(graphfile);
				graphfile = NULL;
				fprintf(stderr, "File %s exists",
					graphname);
				if (flags.batch)
					_exit(2);
				fprintf(stderr, ", overwrite? ");
				if (inp_char() == 'y') {
					flags.ucreate = TRUE;
					open_graph();
				}
				else
					graphname[0] = '\0';
				putchar('\n');
			}
			else {
				flags.ucreate = TRUE;
				open_graph();
			}
		}
	}			/* create options taken care of now */
	else {
		graphfile=fopen(graphname, "r+b");
		if (!graphfile)
			graphfile=fopen(graphname, "rb");
		if (!graphfile) {
			fprintf(stderr, "File %s does not exist",
				graphname);
			if (flags.batch)
				_exit(2);
			fprintf(stderr, ", create? ");
			if (inp_char() == 'y') {
				flags.create = TRUE;
				open_graph();
			}
			else
				graphname[0] = '\0';
			putchar('\n');
		}
		else {
			i = fgetc(graphfile);
			j = fgetc(graphfile);
			if (i+j*0x100 == 640)
				method = MSOFT_METHOD;
			else {
				str[0] = (char)i;
				str[1] = (char)j;
				fgets(str+2, 79, graphfile);
				if (strcmp(str+9, title) != 0) {
					fclose(graphfile);
					graphfile = NULL;
					fprintf(stderr, "Invalid graph file %s",
						graphname);
					if (flags.batch)
						_exit(2);
					fprintf(stderr, "\n\n");
					graphname[0] = '\0';
					return;
				}
				else {
					fgets(str, 79, graphfile);
					fgetc(graphfile);	/* skip EOF byte */
				}
			}
			read_header();
		}
	}
}


void read_header()
{
	unsigned i;
	long l;
	register unsigned j;
	struct {
		double r1, i1, r2, i2, ri, ii, a;
	} r;
	static Byte ctable[17] = {0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
			   	   0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0};

	if (flags.mode)
		desiredmode = graphmode;
	if (method != MSOFT_METHOD) {
		fread((char *)&graphmode, sizeof(graphmode), 1, graphfile);
		cgapalette = (Byte)fgetc(graphfile);
		cgaborder = (Byte)fgetc(graphfile);
		fread((char *)&xcenter, sizeof(xcenter), 1, graphfile);
		fread((char *)&ycenter, sizeof(ycenter), 1, graphfile);
		fread((char *)&xsize, sizeof(xsize), 1, graphfile);
		fread((char *)&percentage, sizeof(percentage), 1, graphfile);
		fread((char *)&yfactor, sizeof(yfactor), 1, graphfile);
		fread((char *)&i, sizeof(i), 1, graphfile);
		if (!flags.count)
			maxcount = i;
		fread((char *)&i, sizeof(i), 1, graphfile);
		if (!colorjump)
			colorjump = i;
		fread((char *)&uniquecolors, sizeof(uniquecolors), 1, graphfile);
		tablepos = ftell(graphfile);
		fread((char *)otable, sizeof(otable), 1, graphfile);
		for (j=0; j<17; j++)		/* check against old colors */
			if (otable[j] != ctable[j])
				break;
		if (j != 17)			/* this is just a klugde */
			for (j=0; j<17; j++)	/* to correct old color tables */
				ptable[j] = otable[j];
		i = fgetc(graphfile);		/* method-code + extra-bytes */
		if (i == OLD_METHOD && flags.method && method >= COMPACT_METHOD) {
			flags.compact = TRUE;
			fseek(graphfile, -1l, SEEK_CUR);
			fputc(method, graphfile);
			fseek(graphfile, 0l, SEEK_CUR);
		}
		method = (char)i;
		if (method >= RANGE_METHOD) {
			fread((char *)&minvalue, sizeof(minvalue), 1, graphfile);
			fread((char *)&maxvalue, sizeof(maxvalue), 1, graphfile);
		}
		else {
			minvalue = 1;
			maxvalue = maxcount-1;
		}
		fread((char *)&i, sizeof(i), 1, graphfile);
		if (flags.compact)		/* save position at end of header */
			comppos = ftell(graphfile);
	}
	else {
		fread((char *)&i, sizeof(i), 1, graphfile);
		if (i == 350)
			graphmode = 5;
		else if (i == 480)
			graphmode = 6;
		else
			graphmode = 1;
		fread((char *)&i, sizeof(i), 1, graphfile);
		if (!flags.count)
			maxcount = i+1;
		fread((char *)&r, sizeof(r), 1, graphfile);
		xcenter = (r.r1+r.r2)/2.0;
		ycenter = (r.i1+r.i2)/2.0;
		xsize = (r.r2-r.r1);
		percentage = 100.0;
		yfactor = (1.0/r.a);
		colorjump = 1;
		minvalue = 1;
		maxvalue = maxcount-1;
		for (j=0; j<=i; j++)	/* throw away histogram for now */
			fread((char *)&l, sizeof(l), 1, graphfile);
	}

	flags.mode = flags.x = flags.y = flags.size =
		flags.percent = flags.ratio = flags.count = TRUE;

	if (!flags.batch && !flags.dirty) {
		printf("Graph mode: %u\n", graphmode);
		printf("Center x: %f\n", xcenter);
		printf("Center y: %f\n", ycenter);
		printf("Width: %f\n", xsize);
		printf("Percentage: %f\n", percentage);
		printf("Aspect: %f\n", 1.0/yfactor);
		printf("Max iterations: %u\n", maxcount);
		printf("Range: %u to %u\n", minvalue, maxvalue);
		printf("File format: ");
		if (method == MSOFT_METHOD)
			printf("Microsoft\n");
		else if (method >= COMPACT_METHOD)
			printf("Compressed\n");
		else
			printf("Uncompressed\n");
		press_key();
	}
	if (method > KNOWN_METHOD) {
		printf("Extended header unknown to this version\n");
		exit(2);
	}
}


void write_header()
{
	int i = 0;

	flags.critical = TRUE;
	fwrite((char *)&oldgraphmode, sizeof(oldgraphmode), 1, graphfile);
	putc(cgapalette, graphfile);
	putc(cgaborder, graphfile);
	fwrite((char *)&xcenter, sizeof(xcenter), 1, graphfile);
	fwrite((char *)&ycenter, sizeof(ycenter), 1, graphfile);
	fwrite((char *)&xsize, sizeof(xsize), 1, graphfile);
	fwrite((char *)&oldpercentage, sizeof(oldpercentage), 1, graphfile);
	fwrite((char *)&yfactor, sizeof(yfactor), 1, graphfile);
	fwrite((char *)&maxcount, sizeof(maxcount), 1, graphfile);
	fwrite((char *)&colorjump, sizeof(colorjump), 1, graphfile);
	fwrite((char *)&uniquecolors, sizeof(uniquecolors), 1, graphfile);
	tablepos = ftell(graphfile);
	fwrite((char *)ptable, sizeof(ptable), 1, graphfile);
	putc(method, graphfile);	/* method-code + extra-bytes */
	if (method >= RANGE_METHOD) {
		minmaxpos = ftell(graphfile);
		fwrite((char *)&minvalue, sizeof(minvalue), 1, graphfile);
		fwrite((char *)&maxvalue, sizeof(maxvalue), 1, graphfile);
	}
	fwrite((char *)&i, sizeof(i), 1, graphfile);
	flags.critical = FALSE;
}


void prep_graph()
{
	int i;

	oldgraphmode = graphmode;	/* save graphmode asked for */
	if (flags.nodisp)
		printf("\nComputing now...\n");
	else {
		if (oldmode == 7) {
			if (!egamode) {
				flags.nodisp = TRUE;
				printf("\nNo CGA, display inhibited\n");
			}
			else
				for (i=0; i<5; i++)
					vtable[i] = 0x0F;
		}
		else if (graphmode >= 3 && !egamode) {
			if (graphmode == 3)
				graphmode = 1;
			else if (graphmode == 4)
				graphmode = 2;
			else if (graphmode >= 5) {
				graphmode = 2;
				flags.alternate = TRUE;
			}
		}
		else if (graphmode == 5 && egamode == 1 || desiredmode == 4) {
			graphmode = 4;
			flags.alternate = TRUE;
		}
		else if (graphmode == 6 && egamode != 4 || desiredmode == 5) {
			graphmode = 5;
			flags.alternate = TRUE;
		}
	}
	vwidth = 640;
	vheight = 200;
	rheight = vheight;
	if (graphmode == 1 || graphmode == 3)
		vwidth = 320;
	else if (graphmode < 5 && flags.alternate)
		vheight = 350;
	else if (graphmode < 6 && flags.alternate) {
		vheight = 480;
		rheight = 350;
	}
	else if (graphmode == 5) {
		vheight = 350;
		rheight = vheight;
	}
	else if (graphmode == 6) {
		vheight = 480;
		rheight = vheight;
	}
	oldpercentage = percentage;
	percentage = sqrt(percentage/100.0);
	hsize = (int)(vwidth * percentage);
	vsize = (int)(vheight * percentage);
	rsize = (int)(rheight * percentage);
	hoffset = (vwidth - hsize)/2;
	voffset = (rheight - rsize)/2;
	if (yfactor == 1.0)
		yfactor = (double)(vheight/vwidth);

	if (!colorjump)
		colorjump++;
	if (egasize == 1)	/* 64kb EGA has 3-color(+bkgd) limit */
		utable[4] = 4;
	if (uniquecolors > utable[graphmode-1]-1)
		uniquecolors = utable[graphmode-1]-1;
}


unsigned get_count()
{
	static int counts = 0,
			eof = 0;
	register unsigned c1, c2;

	if (!graphfile || flags.create)
		return(0);
	if (duptotal == 0) {
		/* if (!fread((char *)&count, sizeof(count), 1, graphfile)) { */
		if (!feof(graphfile))
			c1 = getc(graphfile);
		if (!feof(graphfile))
			c2 = getc(graphfile);
		else {
			if (!eof) {
				eof++;
				putch(7);	/* beep once to inform eof */
			}
			if (method == MSOFT_METHOD)
				return(0);	/* we no write that kinda file */
			else {
				flags.create = TRUE;
				clearerr(graphfile);
				if (flags.compact)
					fseek(graphfile, comppos, SEEK_SET);
				else
					fseek(graphfile, 0l, SEEK_CUR);
				return(dupvalue = 0);
			}
		}
		if (method >= COMPACT_METHOD) {
			duptotal = --c1;
			if (c2 != 0xff)
				return(dupvalue = c2);
			else
				return(dupvalue = maxcount);
		}
		else if (method == MSOFT_METHOD) {
			duptotal = (c1 + (c2*0x100));
			if (scantotal <= 0) {
				scantotal = duptotal;
				counts = 0;
				fread((char *)&duptotal, sizeof(duptotal), 1, graphfile);
			}
			counts++;
			scantotal--;
			if (duptotal >= 0) {
				dupvalue = duptotal;
				if (scantotal > 0)
					duptotal = 0;
				else
					duptotal = vwidth-counts;
			}
			else {
				fread((char *)&dupvalue, sizeof(dupvalue), 1, graphfile);
				scantotal--;
				if (scantotal > 0)
					duptotal = -duptotal - 1;
				else
					duptotal = vwidth-counts;
			}
			return(++dupvalue);
		}
		else
			return(c1 + (c2 << 8));
	}
	else {
		counts++;
		duptotal--;
		return(dupvalue);
	}
}


void put_count(count)
unsigned count;
{
	long l;
	unsigned c;

	if (graphfile)
		if (flags.create)
			if (method == OLD_METHOD)
				fwrite((char *)&count, sizeof(count), 1, graphfile);
			else {		/* assume method must be compact */
				if (dupvalue == 0)
					dupvalue = count;
				if (dupvalue != count || duptotal == 0xff) {
					if (dupvalue >= maxcount && maxcount >= 0xff)
						c = 0xff;
					else
						c = ((--dupvalue) % (0xfe) + 1);
					c = (c << 8) + duptotal;
					fwrite((char *)&c, sizeof(c), 1, graphfile);
					dupvalue = count;
					duptotal = 0;
				}
				duptotal++;
			}
		else if (flags.compact) {
			if (compvalue == 0)
				compvalue = count;
			if (compvalue != count || comptotal == 0xff) {
				if (compvalue >= maxcount && maxcount >= 0xff)
					c = 0xff;
				else
					c = ((--compvalue) % (0xfe) + 1);
				c = (c << 8) + comptotal;
				l = ftell(graphfile);
				fseek(graphfile, comppos, SEEK_SET);
				fwrite((char *)&c, sizeof(c), 1, graphfile);
				comppos += sizeof(c);
				fseek(graphfile, l, SEEK_SET);
				compvalue = count;
				comptotal = 0;
			}
			comptotal++;
		}
}


void do_graph()
{
	unsigned yi, c;
	register unsigned xi, count;
	double x, y, xcorner, ycorner;
	double step, stepinc;
	double a, b, ta, tb, m;

	xgap = xsize / hsize;
	ygap = (ysize = xsize * yfactor) / vsize;
	xcorner = xcenter - xsize/2.0;
	ycorner = ycenter + ysize/2.0;
	step = stepinc = vsize / 79.0;
	y = ycorner;
	for (yi = 1;  yi <= vsize;  yi++) {
		#ifdef	FASTX
		x = xcorner;
		#endif
		for (xi = 1;  xi <= hsize;  xi++) {
			count = get_count();
			if (!count) {	/* where 95% of the time goes... */
				#ifndef	FASTX
				x = xcorner + (xi-1)*xgap;
				#endif
				if ((xi & 0x0f) == 0)
					if (kbhit())
						;
				c = xi;	/* save register value */
				xi = maxcount;
				a = b = ta = tb = m = zero;
				while (count++ < xi && m < 4.0) {
					b = 2*a*b + y;
					a = ta-tb + x;
					m = (ta = a*a) + (tb = b*b);
				}
				xi = c;	/* restore register variable */
				count--;
				if (count < minvalue)
					minvalue = count;
				if (count > maxvalue && count < maxcount)
					maxvalue = count;
			}		/* therefore, needs optimizing... */
			else if ((xi & 0x7f) == 0)
				if (kbhit())
					;
			#ifdef	FASTX
			x += xgap;
			#endif
			if (!flags.nodisp)
				write_point(xi, yi, count);
			put_count(count);
		}
		y -= ygap;
		if (flags.nodisp)
			while (yi >= (unsigned)step) {
				printf("*");
				step += stepinc;
			}
	}
	if (method >= COMPACT_METHOD) {
		put_count(0xffff);	/* a way to flush dup data */
		dupvalue = 0;
		duptotal = 0;		/* clear the dup variables now */
	}
}


void write_point(xi, yi, count)
register unsigned xi;
unsigned yi;
int count;
{
	register Byte color, i;
	union REGS regs;
	static Byte far *addr = (Byte far *)(0xA0000000l);
	static int lastxi = -1, lastyi = 0;
	static Byte lastcolor, lastmask = 0;
	static Byte mask[] = {0x80, 0x40, 0x20, 0x10,
					0x08, 0x04, 0x02, 0x01};
	static Word spread = 0;

	if (flags.alternate)
		if (graphmode < 5) {
			if ( !(yi & 0x01) )
				return;
			else
				yi -= yi/2;
		}
		else {
			if ( !(yi & 0x03) )
				return;
			else {
				yi -= yi/4;
				if (yi > rsize)
					return;
			}
		}
	if (count >= maxcount)
		color = 0;
	else {
		if (!spread)
			if (flags.color && !flags.create)
				spread = (maxvalue-minvalue+1)/uniquecolors;
		if (spread)
			color = (Byte)(count/spread + 1);
		else {
			if (colorjump > 1)
				count = (--count)/colorjump + 1;
			color = (Byte)((--count)%uniquecolors + 1);
		}
		if (graphmode == 5 && egasize == 1)
			if (color >= 2)		/* for 64kb ega mode... */
				color += 2;	/* palette mapping differs */
	}
	yi = --yi+voffset;
	xi = --xi+hoffset;
	    /* for ega modes, blast directly to ram */
	if (graphmode == 5 && egasize > 1 || graphmode == 6) {
	    /* recompute byte address if pixel not sequential */
		if (xi != ++lastxi || yi != lastyi)
		    if (xi != 0 || yi != ++lastyi)
			addr = (Byte far *)(0xA0000000l + (yi*80) + xi/8);
	    /* if a change in color has occurred, flush old color */
		if (color != lastcolor && (lastmask || flags.dirty)) {
			outp(0x3CE, 8);	/* select bit mask register */
			outp(0x3CF, lastmask);
			if (flags.dirty) {
				outp(0x3C4, 2);	/* clear all planes */
				outp(0x3C5, 0x0f);
				i = *addr;	/* latch... */
				*addr = 0;
			}
			outp(0x3C4, 2);	/* select map mask register 2 */
			outp(0x3C5, lastcolor);
			i = *addr;	/* latch... */
			*addr = 0xFF;	/* set bits in enabled planes */
			lastmask = 0;	/* all bits flushed */
		}
	    /* now record the current color and bit position */
		if ((lastcolor = color) || flags.dirty)
			lastmask |= mask[xi & 0x07];
	    /* if last pixel this byte, or last pixel this line, flush */
		if ((xi & 0x07) == 0x07 || xi == hsize+hoffset-1) {
			outp(0x3CE, 8);	/* select bit mask register */
			outp(0x3CF, lastmask);
			if (flags.dirty) {
				outp(0x3C4, 2);	/* clear all planes */
				outp(0x3C5, 0x0f);
				i = *addr;
				*addr = 0;
			}
			outp(0x3C4, 2);	/* select map mask register 2 */
			outp(0x3C5, color);
			i = *addr;	/* latch... */
			*addr = 0xFF;	/* set bits in enabled planes */
			lastmask = 0;	/* all bits flushed */
			addr++;		/* adjust address every 8 pixels */
		}
	    /* record current coordinates to verify next pixel sequential */
		lastxi = xi;
		lastyi = yi;
	}
	else {			/* use bios function otherwise */
		regs.h.al = color;	/* SORRY GUYS! */
		regs.h.ah = 0x0C;	/* write-dot function # */
		regs.h.bh = 0;		/* page # */
		regs.x.cx = xi;		/* column */
		regs.x.dx = yi;		/* and row, both relative to 0 */
		int86(0x10, &regs, &regs);
	}
}


Byte read_dot(xi, yi)
unsigned xi, yi;
{
	union REGS regs;

	regs.h.ah = 0x0D;	/* read-dot function # */
	regs.h.bh = 0;		/* page # */
	regs.x.cx = --xi+hoffset;	/* column */
	regs.x.dx = --yi+voffset;	/* and row, both relative to 0 */
	int86(0x10, &regs, &regs);
	return(regs.h.al & 0x0f);	/* return color */
}


void write_dot(xi, yi, color)
register unsigned xi, yi;
Byte color;
{
	union REGS regs;

	regs.h.ah = 0x0C;	/* write-dot function # */
	regs.h.al = color;
	regs.h.bh = 0;		/* page # */
	regs.x.cx = --xi+hoffset;	/* column */
	regs.x.dx = --yi+voffset;	/* and row, both relative to 0 */
	int86(0x10, &regs, &regs);
	return;
}


void get_switches(count, tbladr)
int	count;
char	**tbladr;
{
	int total;

	for (total = count; count > 0; count--,tbladr++) {
		if (**tbladr == '-' || **tbladr == '/') {
			(*tbladr)++;		/* past switch char */
			switch (tolower(*(*tbladr)++)) {
			case 'h':		/* past 1st letter now */
			case '?':
				flags.help = TRUE;
				help();
				if (total > 1) {
					putchar('\n');
					break;
				}
				else
					exit(0);
			case 'l':
				do_title();
				fprintf(stderr,
					"Load option not supported yet\n\n");
				flags.error = TRUE;
				break;
			case 'e':
				flags.ega = TRUE;
				if (tolower(**tbladr) == 'm')
					egamode = 2;
				else
					egamode = 1;
				break;
			case 'b':
				flags.batch = TRUE;
				break;
			case 'd':
				flags.debug = TRUE;
				break;
			case 'n':
				flags.nodisp = TRUE;
				break;
			case 't':
				flags.time = TRUE;
				break;
			case 'k':
				flags.color = TRUE;
				colorlist = *tbladr;
				break;
			case 'j':
				colorjump = atoi(*tbladr);
				break;
			case 'c':
				flags.create = TRUE;
				if (tolower(**tbladr) == 'u')
					flags.ucreate = TRUE;
				break;
			case 's':
				flags.std = TRUE;
				break;
			case 'v':
				flags.pause = TRUE;
				break;
			case 'i':
				strcpy(imagename, *tbladr);
				break;
			case 'x':
				flags.x = TRUE;
				xcenter = atof(*tbladr);
				break;
			case 'y':
				flags.y = TRUE;
				ycenter = atof(*tbladr);
				break;
			case 'w':
				flags.size = TRUE;
				xsize = atof(*tbladr);
				break;
			case 'p':
				flags.percent = TRUE;
				percentage = atof(*tbladr);
				break;
			case 'r':
				flags.ratio = TRUE;
				yfactor = atof(*tbladr);
				if (yfactor >= 1.0)
					yfactor = 1.0/yfactor;
				else
					yfactor = 1.0;
				break;
			case 'g':
				flags.mode = TRUE;
				graphmode = atoi(*tbladr);
				break;
			case 'm':
				flags.count = TRUE;
				maxcount = atoi(*tbladr);
				break;
			case 'f':
				flags.method = TRUE;
				method = (Byte)atoi(*tbladr);
				break;
			default:
				do_title();
				fprintf(stderr,
					"Unknown option: %c\n", *(*tbladr-1));
				flags.error = TRUE;
				break;
			}
		}
		else {
			if (!graphname[0])
				strcpy(graphname, *tbladr);
			else {
				do_title();
				fprintf(stderr,
					"Argument ignored: %s\n", *tbladr);
				flags.error = TRUE;
			}
		}
	}
	if (flags.error || flags.help && flags.batch)
		press_key();
}


void help()
{
	do_title();
	puts("\
Usage:    mbrot [graph-file] [options...]\n\n\
Options:  -h	list usage and options\n\
	  -b	select batch-mode operation\n\
	  -n	inhibit display during computation\n\
	  -k...	defines colors (ie, B1b1g1c1r1m1o1w1)\n\
	  -j#	defines color granularity\n\
	  -c	create graph-file (default is restore)\n\
	  -cu	create graph-file unconditionally\n");
	puts("\
	  -x#.#	set x(real) co-ordinate of center\n\
	  -y#.#	set y(imaginary) co-ordinate of center\n\
	  -w#.#	set width(real) of graph\n\
	  -p#	set percentage of screen to be used\n\
	  -r#.#	set vertical/horizontal ratio\n\
	  -g#	select graphics mode #\n\
	  -m#	specify maximum iterations per pixel\n");
#ifdef	COMPLETE
	puts("\
	  -ifn	add graph to image-library-file fn\n\
	  -v	pause after each frame of image-library\n\
	  -s	specify standard algorithm (non-recursive)\n");
#endif
}


void clr_kbd()
{
	while (kbhit())
		getch();
}


void press_key()
{
	FILE *f;

	if (flags.error)
		f = stderr;
	else
		f = stdout;
	fprintf(f, "\nPress any key to continue...");
	clr_kbd();
	getch();
	putchar('\n');
	flags.error = FALSE;
}


char inp_char()
{
	char c;

	c = (char)tolower(getche());
	putchar('\n');
	return(c);
}


int inp_line(fmt, arg1)
char	*fmt;
double	*arg1;
{
	char	line[132];

	if (!gets(line))
		exit(0);
	return(sscanf(line, fmt, arg1));
}

