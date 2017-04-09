{ B+,C-,I-,R+,V-,U-,K+  for testing}
{$B+,C-,I-,R-,V-,U-,K-  for final copy}

program mandelbrot (input, output);

const
  pixwide = 320;                {normal bounds for color graphics}
  pixhigh = 200;
  ctrlc   = #3;                 {popular keys}
  ctrlz   = #26;
  escape  = #27;
  maxloop = 250;                {normally 1000, for standard algorithm}
  fmask = 'mbrot.???';

type
  str = string[80];

  reglist = record
              case integer of
               1: (al, ah, bl, bh, cl, ch, dl, dh:  byte);
               2: (ax, bx, cx, dx, bp, si, di, ds, es, fg:  integer);
              end;

var
  regs:  reglist;               {sys variables}
  critical:  boolean;

  noshow, interrupt, color, highres:  boolean;
  crtmode, crtsize, crtpage:  byte;
  hwidth, vwidth:  integer;
  pic:  array [1..pixwide, 1..pixhigh] of byte;


  procedure sysexit;  forward;

  function  yes (s: str):  boolean;  forward;


  procedure abort (code: byte);
  var
    errorlvl:  byte;

   begin
    errorlvl:= 0;
     case code of
      1:  writeln ('Graphics Interface is required');
     end;
    sysexit;
    halt (errorlvl);
   end;


  procedure break;

   begin
    if not critical then
     begin
      critical:= true;
      if yes ('Abort program') then abort (0);
      critical:= false;
     end;
   end;


  procedure conout (c: char);

   begin
    critical:= true;
    regs.ah:= $02;
    regs.dl:= ord(c);
    intr ($21, regs);
    critical:= false;
   end;


  procedure sysbreak;

   begin
    inline ($50/$53/$51/$52/$56/$57/$1E/$06/$FB);
    break;
    inline ($07/$1F/$5F/$5E/$5A/$59/$5B/$58/$8B/$E5/$5D/$CF);
   end;


  procedure sysinit;

   begin
    lowvideo;
(*  regs.ah:= $25;              {dos set-vector function}
    regs.al:= $23;              {dos ctrl-break vector no.}
    regs.ds:= cseg;  regs.dx:= ofs(sysbreak);
    intr ($21, regs);  *)
    critical:= false;           {set global var to true to prevent breaks}
    regs.ah:= 15;               {video state function}
    intr ($10, regs);           {bios video i/o interrupt}
    crtmode:= regs.al;  crtsize:= regs.ah;  crtpage:= regs.bh;
    conoutptr:= ofs(conout);
    writeln;
   end;


  procedure sysexit;
  var
    resetmode:  boolean;
    mode:  byte absolute $0040:$0049;

   begin
    resetmode:= false;
    if (mode = 0) or (mode = 1) then
      if (crtmode = 0) or (crtmode = 1) then
        mode:= crtmode          {either state is 40x25}
      else
        resetmode:= true
    else
    if (mode = 2) or (mode = 3) then
      if (crtmode = 2) or (crtmode = 3) then
        mode:= crtmode          {either state is 80x25}
      else
        resetmode:= true
    else
      if (mode <> crtmode) then resetmode:= true;
    if resetmode then
     begin
      regs.ah:= 0;              {reset screen}
      regs.al:= crtmode;        {to original video state}
      intr ($10, regs);
     end;
   end;


  procedure graphinit;

   begin
    intr ($11, regs);           {bios equipment check}
    if (regs.ax and $30) = $30 then abort (1);
    vwidth:= pixhigh;  hwidth:= pixwide;
    color:= yes ('Color');
    if color then
     begin
      highres:= false;
      writeln ('Low Resolution (320x200)');
     end
    else
      highres:= yes ('High Resolution (640x200)');
    if highres then
      hwidth:= pixwide*2;
    noshow:= yes ('Compute only');
    interrupt:= yes ('Allow kbd interrupt');
    if not noshow then
      if highres then           {set the screen up}
       begin
        hires;
        hirescolor (blue);
       end
      else
      if color then
       begin
        graphcolormode;
        palette (1);
        graphbackground (0);
       end
      else
       begin
        graphmode;
       end;
   end;


  procedure keyin (var ac, ec: char);

   begin
    read (kbd, ac);  ec:= chr(0);
    if ac = escape then
      if keypressed then read (kbd, ec);
   end;


  procedure tone (hz, ms: integer);

   begin
    sound (hz);  delay (ms);  nosound;
   end;


  function yes;
  var
    c, d:  char;
    ok, ask:  boolean;

   begin                        {request Y or N from kbd}
    ask:= true;  ok:= false;
     repeat
      if ask then write (s, ' (Y/N)? ');
      ask:= false;
      keyin (c, d);
      c:= upcase (c);
      if c = ctrlc then
       begin
        writeln;
        break;
        writeln;  ask:= true;
       end
      else
      if c = 'Y' then
       begin
        writeln ('Yes');
        yes:= true;  ok:= true;
       end
      else
      if c = 'N' then
       begin
        writeln ('No');
        yes:= false;  ok:= true;
       end
      else
        tone (200, 100);
     until ok;
   end;


  procedure fname (n: integer;  var fn: str);
  var
    i:  integer;

   begin
    fn:= fmask;
    i:= length(fn);
    while i >= 1 do
     begin
      if fn[i] = '?' then
       begin
        fn[i]:= chr(48+(n mod 10));  n:= n div 10;
       end;
      i:= i - 1;
     end;
   end;


  procedure save (n: integer;  x, y, w: real;  var ok: boolean);
  var
    f:  text;
    fn:  str;
    i, j:  integer;

   begin
    fname (n, fn);
    assign (f, fn);
    rewrite (f);
    if ioresult <> 0 then
      ok:= false
    else
     begin
      writeln (f, x:14:11, y:14:11, w:14:11);
      for i:= 1 to pixwide do
        for j:= pixhigh downto 1 do
          writeln (f, pic[i,j]);
      close (f);
      ok:= true;
      if noshow then
       begin
        writeln;
        writeln ('File #', n:1, ' created successfully');
       end;
     end;
   end;


  procedure restore (n: integer;  var x, y, w: real;  var ok: boolean);
  var
    f:  text;
    fn:  str;
    i, j:  integer;

   begin
    fname (n, fn);
    assign (f, fn);
    reset (f);
    if ioresult <> 0 then
     begin
      ok:= false;
      for i:= 1 to pixwide do
        for j:= pixhigh downto 1 do pic[i,j]:= 0;
     end
    else
     begin
      readln (f, x, y, w);
      for i:= 1 to pixwide do
        for j:= pixhigh downto 1 do
          readln (f, pic[i,j]);
      close (f);
      ok:= true;
     end;
   end;


  procedure compute;
  label
    99;

  var
    z:  char;
    rst, ok:  boolean;
    xi, yi, c, i, filnum:  integer;
    xcenter, ycenter, a, b, x, y, m, ta, tb,
    xcorner, ycorner, xsize, ysize, xgap, ygap:  real;

   begin
    writeln ('Mandelbrot Zoom  V1.0');
    writeln ('By Radix 2 Software  November 1985');
     repeat
      writeln;
      rst:= yes ('Restore from file');
      write ('Enter file #: ');
      readln (filnum);          {do restore to initialize pic array}
      restore (filnum, xcenter, ycenter, xsize, ok);
      if rst then
        if not ok then
          writeln ('File not found')
        else
      else
       begin
        if ok then
         begin
          ok:= yes ('File exists, overwrite');
          if not ok then rst:= true;
         end
        else
          ok:= true;
        if ok then
         begin
          write ('X of center: ');
          readln (xcenter);
          write ('Y of center: ');
          readln (ycenter);
          write ('Width of window: ');
          readln (xsize);
         end;
       end;
     until ok;
    graphinit;
    ysize:= xsize;              {ysize should be some fraction of xsize}
    xgap:= xsize / hwidth;      {to compensate for squished effect of display}
    ygap:= ysize / vwidth;
    xcorner:= xcenter - xsize/2.0;
    ycorner:= ycenter - ysize/2.0;
    y:= ycorner + ysize;
    for yi:= vwidth downto 1 do
     begin
      x:= xcorner;
      for xi:= 1 to hwidth do
       begin
        if interrupt then
          while keypressed do
           begin                {check to see if they want out}
            read (kbd, z);
            if z = ctrlz then
              goto 99           {quick save & exit}
            else
            if z = ctrlc then
             begin              {simply abort immediately}
              gotoxy (1, 22);
              break;
             end;
           end;
        c:= 0;
        if xi <= pixwide then
          c:= pic[xi,yi];
        if c = 0 then           {if counted already, don't compute}
         begin
          a:= 0.0;              {normally loop below will go to 1000 to}
          b:= 0.0;              {to verify mandelbrot points; however, to}
          c:= 0;  m:= a;        {save each count in the pic array, we limit}
          ta:= a;  tb:= b;      {ourselves to the highest byte value allowed}
          while (c < maxloop) and (m < 4.0) do
           begin
            b:= 2*a*b + y;      {this is an optimization of iteration...}
            a:= ta-tb + x;      {if we can stop when the square root reaches}
            c:= c + 1;          {2, then we can stop when we reach 4,}
            ta:= a*a; tb:= b*b; {or once we loop the minimum number of times}
            m:= ta + tb;
           end;
          if xi <= pixwide then {we can't store complete high-res display}
            pic[xi,yi]:= c;     {in the array, since turbo's total variable}
         end;
        if not noshow then
         begin
          i:= 0;                {space cannot exceed 64kb, and with the pic}
           case c of            {array at 320x200, 64000 is used right there}
            1..3:     i:= 1;
            4..6:     i:= 2;
            7..10:    i:= 3;
            11..50:   i:= 1;
            51..100:  i:= 2;
            101..150: i:= 3;
            151..249: i:= 1;
            250:      i:= 0;    {an inky black point in the mandelbrot set}
           end;
          plot (xi, vwidth-yi+1, i);
         end;
        x:= x + xgap;
       end;
      if noshow then
        if (yi mod 4) = 0 then write ('*') else
      else
        tone (200, 5);
      y:= y - ygap;
     end;
99: if not rst then
      save (filnum, xcenter, ycenter, xsize, ok);
    if not noshow then
     begin
      while keypressed do read (kbd, z);
      read (kbd, z);
     end;
   end;


 begin
  sysinit;
  compute;
  sysexit;
 end.
