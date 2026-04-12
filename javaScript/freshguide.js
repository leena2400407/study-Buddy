document.addEventListener("DOMContentLoaded", function()
{

let notes = document.querySelectorAll('.note'),
    dots = document.querySelectorAll('.dot'),
    stack = document.getElementById('stack'),
    final = document.getElementById('final'),
    dotsContainer = document.getElementById('dots'),
    i = 0;

function show(n)
{
  notes.forEach(x=>x.className='note');

  if(notes[n]) notes[n].classList.add('active');
  if(notes[n+1]) notes[n+1].classList.add('behind');

  dots.forEach((d,x)=>
    x<=n ? d.classList.add('done') : d.classList.remove('done')
  );
}

window.next = function()
{
  notes[i].classList.add('fly');
  i++;

  setTimeout(()=>
    {
    if(i<notes.length) show(i);
    else
    {
      stack.style.display='none';
      dotsContainer.style.display='none';
      final.style.display='block';
    }
   },300);
}

window.restart = function()
{
  i=0;
  stack.style.display='block';
  dotsContainer.style.display='flex';
  final.style.display='none';
  show(0);
}

show(0);

}
)
;