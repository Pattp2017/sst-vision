(() => {
  const groups = {compartilhados:'Compartilhados',treinamentos:'Treinamentos',epis:'EPIs',checklist:'Checklist',configuracoes:'Configurações gerais'};
  const records = window.CADASTROS;
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const $ = id => document.getElementById(id);
  let group = 'todos';
  const tags = record => {
    const box = document.createElement('div'); box.className = 'catalog-tags';
    for (const label of record.etiquetas) {
      const tag = document.createElement('span');tag.className='catalog-tag';tag.dataset.modulo=label;tag.textContent=label;box.append(tag);
    }
    return box;
  };
  function render() {
    const query = normalize($('busca-cadastro').value);
    const root = $('grupos'); root.replaceChildren();let total=0;
    for (const [id,name] of Object.entries(groups)) {
      const relevant = record => group === 'todos' || record.grupo === group || (record.grupo === 'compartilhados' && ['treinamentos','epis','checklist'].includes(group) && (record.etiquetas.includes(groups[group]) || record.etiquetas.includes('Compartilhado')));
      const items=records.filter(record=>record.grupo===id && relevant(record) && normalize([record.nome,record.descricao,...record.etiquetas].join(' ')).includes(query));
      if(!items.length)continue;
      const section=document.createElement('section');section.className='catalog-section';
      const heading=document.createElement('h2');heading.className='catalog-heading';heading.textContent=name;section.append(heading);
      const grid=document.createElement('div');grid.className='catalog-grid';
      for(const record of items){
        const card=document.createElement('a');card.className='catalog-card';card.href='?cadastro='+encodeURIComponent(record.id)+'&grupo='+group;
        const title=document.createElement('h3');title.textContent=record.nome;
        const description=document.createElement('p');description.textContent=record.descricao;
        card.append(title,description,tags(record));
        card.addEventListener('click',event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(card.href)});
        grid.append(card);total++;
      }
      section.append(grid);root.append(section);
    }
    $('vazio').hidden=total!==0;$('resultado-busca').textContent=total+' cadastro(s) encontrado(s).';
  }
  function route() {
    const params=new URLSearchParams(location.search);group=groups[params.get('grupo')]?params.get('grupo'):'todos';
    for(const link of document.querySelectorAll('[data-grupo]')){
      const active=link.dataset.grupo===group;link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
    }
    const record=records.find(item=>item.id===params.get('cadastro'));
    $('catalogo').hidden=Boolean(record);$('editor').hidden=!record;
    if(record){
      $('editor-titulo').textContent=record.nome;$('editor-descricao').textContent=record.descricao;
      $('editor-etiquetas').replaceChildren(tags(record));
      $('carregando').hidden=false;$('formulario').hidden=true;$('formulario').title=record.nome;
      $('formulario').src=record.src;document.title=record.nome+' | Cadastros · SST Vision';
    }else{
      $('formulario').removeAttribute('src');render();document.title='Cadastros | SST Vision';
    }
  }
  function navigate(url){history.pushState(null,'',url);route();window.scrollTo({top:0,behavior:'auto'})}
  for(const link of document.querySelectorAll('[data-grupo]'))link.addEventListener('click',event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();$('busca-cadastro').value='';navigate(link.href)});
  $('busca-cadastro').addEventListener('input',render);
  $('fechar-cadastro').onclick=()=>navigate('?grupo='+group);
  $('formulario').addEventListener('load',()=>{if(!$('formulario').getAttribute('src'))return;$('carregando').hidden=true;$('formulario').hidden=false;});
  window.addEventListener('popstate',route);route();
})();
