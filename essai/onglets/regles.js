/* Onglet Regles : schemas illustres (carte, terrain, cercle des elements). */
/* Règles illustrées */
function annote(box,visuel,items){
  /* Zone [x0,y0,x1,y1] en fraction de carte, couloir y de la ligne, depart x si la ligne sort par le haut ou le bas. */
  const c=el('div','an-carte'),o=el('ol'),v=el('div','an-vis'),H=392/items.length,W=280,Y=392;let g='';c.append(visuel);
  items.forEach(([t,x0,y0,x1,y1,lane,sx],i)=>{
    const li=el('li'),r=el('i','',i+1),m=H*i+H/2,l=lane*Y;li.append(r,t);o.append(li);
    const d=sx!=null?'M'+sx*W+' '+(lane<y0?y0:y1)*Y+'V'+l:'M'+x1*W+' '+l;
    g+='<rect x="'+x0*W+'" y="'+y0*Y+'" width="'+(x1-x0)*W+'" height="'+(y1-y0)*Y+'" rx="3"/><path d="'+d+'H288L306 '+m+'"/><circle cx="318" cy="'+m+'" r="11"/><text x="318" y="'+(m+4.5)+'">'+(i+1)+'</text>';
  });
  v.innerHTML='<svg class="an-liens" viewBox="0 0 330 392" aria-hidden="true">'+g+'</svg>';v.prepend(c);box.textContent='';box.append(v,o);
}
(()=>{
  const i=el('img');i.src=imgV('cartes/001.jpg');i.alt=numeroAffiche('001')+', KaTarN';i.loading='lazy';
  annote($('lireCarte'),i,[['Coût en énergie',.03,.02,.23,.15,.012,.13],['Force',.82,.025,.96,.15,.09],['Nom et sous-titre',.05,.615,.33,.71,.6,.2],['Éléments du Golem',.735,.605,.953,.682,.65],['Capacité',.11,.745,.9,.872,.8],["Encart d'évolution : la carte qui la remplace",.317,.884,.682,.933,.908],['Citation, sans effet en jeu',.055,.95,.245,.985,.933,.15],['Numéro de carte',.855,.952,.93,.982,.967]]);
  const T=window.GolemsMoteur.TERRAINS.find(x=>x.nom==='La Boutique'),t=el('img');t.src=srcTerrain(T);t.alt=T.nom+'. '+T.texte;t.loading='lazy';
  annote($('lireTerrain'),t,[['Points rapportés par le terrain',.77,.02,.97,.16,.09],['Nom',.05,.605,.49,.71,.65],['Effet, actif toute la partie',.145,.79,.855,.837,.75,.7],['Citation, sans effet en jeu',.055,.95,.605,.986,.933,.3],['Numéro du terrain',.855,.952,.925,.984,.967]]);
  const E=['magma','cristal','foudre','brume','roche'],N=['Magma','Cristal','Foudre','Brume','Roche'],R=118,cx=180,cy=172,pt=(a,r)=>[cx+r*Math.cos(a),cy+r*Math.sin(a)].map(v=>v.toFixed(1));
  let a='',b='';E.forEach((e,i)=>{
    const t=-Math.PI/2+i*2*Math.PI/5,[x,y]=pt(t,R),m=.36,p=pt(t+m,R),q=pt(t+2*Math.PI/5-m,R);
    a+='<path d="M'+p+'A'+R+' '+R+' 0 0 1 '+q+'" marker-end="url(#fl)"/>';
    b+='<image href="'+imgV('cartes/'+e+'.png')+'" x="'+(x-29)+'" y="'+(y-29)+'" width="58" height="58"/><text x="'+x+'" y="'+(+y+45)+'">'+N[i]+'</text>';
  });
  const svgC=(id,k)=>'<svg class="cercle-el" viewBox="0 0 360 350" role="img" aria-label="Cercle des éléments : Magma domine Cristal, Cristal domine Foudre, Foudre domine Brume, Brume domine Roche, Roche domine Magma"><defs><marker id="'+id+'" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" style="fill:var(--bleu);stroke:none"/></marker></defs>'+a.replace(/#fl/g,'#'+id)+k+b+'</svg>';
  let k='';E.forEach((e,i)=>{const [x,y]=pt(-Math.PI/2+i*2*Math.PI/5,R);k+='<circle cx="'+x+'" cy="'+y+'" r="33" style="fill:var(--panneau);stroke:var(--'+e+');stroke-width:3"/>'});
  $('cercleAide').innerHTML=svgC('fl2',k);
  $('cercleEl').innerHTML='<svg class="cercle-el" viewBox="0 0 360 350" role="img" aria-label="Cercle des éléments : Magma domine Cristal, Cristal domine Foudre, Foudre domine Brume, Brume domine Roche, Roche domine Magma"><defs><marker id="fl" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" style="fill:var(--bleu);stroke:none"/></marker></defs>'+a+b+'</svg>';
})();

