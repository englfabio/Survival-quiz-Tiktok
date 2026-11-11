# Hilfsskript: erzeugt die Choreografie von scenarios/weihnachtsbaum-brand.json (Texte wortgenau) und richtet
# die Zeitpunkte nach den Wort-Zeitstempeln der Stimme aus. Aufruf: python3 scripts/weihnachtsbaum-choreo.py
# Erzeugt scenarios/weihnachtsbaum-brand.json. Zeitpunkte (cue) aus alignment.json, falls vorhanden.
import json, os, sys
ROOT='/home/user/Survival-quiz-Tiktok'
ID='weihnachtsbaum-brand'
S=dict(
situation="Dein Weihnachtsbaum steht mal wieder in Flammen. Das Feuer schlägt schon bis zur Decke. Was machst du jetzt?",
o1c="Mit Wasser löschen", o1s="Eins: Schnell einen Eimer Wasser holen und löschen.",
o2c="Erst die Geschenke retten", o2s="Zwei: Erst mal die Geschenke unter dem Baum retten.",
o3c="Raus, Tür zu, 112", o3s="Drei: Alle raus aus dem Raum, Tür schließen und die 112 anrufen.",
e1="Kleine Flammen darfst du löschen, wenn es ohne Gefahr geht. Aber ein Baum, der schon bis zur Decke brennt, ist kein kleiner Brand mehr. Mit einem Eimer Wasser bringst du dich nur selbst in Gefahr.",
e2="Kein Geschenk ist dein Leben wert. Feuer und Rauch breiten sich sehr schnell aus, und der Rauch ist giftig. Jede Sekunde im Raum ist eine Sekunde zu viel.",
e3="Bring alle aus dem Raum und schließ die Tür hinter dir. Das bremst Feuer und Rauch. Verlass die Wohnung und ruf die 112. Sag, wo es brennt, was brennt und ob noch jemand in Gefahr ist. Dann warte draußen auf die Feuerwehr.",
countdown="Schreib eins, zwei oder drei in die Kommentare.",
reveal="Richtig ist Nummer drei.",
outro="Frohe Weihnachten! Und, wusstest du es? Schreib's in die Kommentare.",
)
LEAD={'situation':0.3,'explain1':0.6,'explain2':0.6,'explain3':0.6}
MINLEN={'situation':5,'explain1':6,'explain2':6,'explain3':7}
TEXT={'situation':S['situation'],'explain1':S['e1'],'explain2':S['e2'],'explain3':S['e3']}
vd=f'{ROOT}/public/voice/{ID}'
dur=json.load(open(f'{vd}/durations.json')) if os.path.exists(f'{vd}/durations.json') else {}
ali=json.load(open(f'{vd}/alignment.json')) if os.path.exists(f'{vd}/alignment.json') else {}
def seclen(c):
    a=dur.get(c, 0.84+0.0594*len(TEXT[c]))
    return round(max(LEAD[c]+a+0.5, MINLEN[c])*30)/30
def cue(c, phrase):
    """t (0..1) im Abschnitt, an dem phrase beginnt"""
    txt=TEXT[c]; i=txt.index(phrase); L=seclen(c)
    if c in ali:
        st=ali[c]['character_start_times_seconds'][i]
    else:
        st=(0.84+0.0594*len(txt))*i/len(txt)
    return round((LEAD[c]+st)/L,3)
r3=lambda x: round(x,3)
def K(t,x,z,motion,face=None,**kw):
    d={'t':r3(t),'x':x,'z':z,'motion':motion}
    if face is not None: d['face']=face
    d.update(kw); return d
def cam(t,pos,look,fov=None):
    d={'t':r3(t),'pos':pos,'look':look}
    if fov: d['fov']=fov
    return d
TX,TZ=1.5,-1.5
def tree(*keys):  # keys: (t, fire, smoke)
    return [K(t,TX,TZ,'park',180,fire=f,smoke=s) for t,f,s in keys]

# ---------------- Situation
c_deck=cue('situation','Das Feuer schlägt')
c_was=cue('situation','Was machst du')
situation={
 'camera':[cam(0,[-1.8,1.45,5.6],[0.5,0.95,-0.8]), cam(c_was,[-2.1,1.45,6.1],[0.5,0.8,-0.8]), cam(1,[-2.1,1.48,6.3],[0.45,0.7,-0.7])],
 'actors':{
  'weihnachtsbaum':tree((0,0.3,0),(c_deck,0.75,0.35),(c_deck+0.12,1.0,0.7),(1,1.0,0.95)),
  'dummy':[K(0,-0.15,0.1,'stand',45),K(0.08,-0.15,0.1,'stand',45),K(0.085,-0.15,0.1,'recoil',45),K(0.4,-0.4,0.6,'recoil',42),K(1,-0.4,0.6,'recoil',42)],
 },
 'sfx':[{'t':0.02,'id':'feuer-auflodern','volume':0.55},{'t':r3(c_deck),'id':'feuer-auflodern','volume':0.5}],
}
# ---------------- Optionen / Countdown / Auflösung (gleiche Ansicht, Kamera fährt langsam)
def still(p0,l0,p1,l1):
    return {'camera':[cam(0,p0,l0),cam(1,p1,l1)],
     'actors':{'weihnachtsbaum':tree((0,1.0,0.95),(1,1.0,1.0)),'dummy':[K(0,-0.4,0.6,'recoil',42)]}}
options=still([-2.1,1.5,6.6],[0.4,0.55,-0.6],[-1.85,1.5,6.3],[0.4,0.55,-0.6])
countdown=still([-1.7,1.5,6.4],[0.4,0.55,-0.6],[-1.55,1.48,6.2],[0.4,0.55,-0.6])
reveal=still([-1.9,1.5,6.5],[0.4,0.55,-0.6],[-1.85,1.5,6.4],[0.4,0.55,-0.6])
for sh in (options,countdown,reveal):
    sh['actors']['dummy'][0]['motion']='recoil'

# ---------------- Option 1: Eimer
c_aber=cue('explain1','Aber ein Baum')
fz1=r3(c_aber+0.08)
run0=r3(c_aber-0.18)
exp1={
 'camera':[cam(0,[-1.9,1.35,5.6],[0.0,0.85,-0.2]), cam(run0,[-2.0,1.35,5.8],[0.2,0.9,-0.4]), cam(fz1,[-2.2,1.3,6.2],[0.6,1.05,-0.9]), cam(1,[-2.25,1.3,6.4],[0.6,1.1,-0.9])],
 'actors':{
  'weihnachtsbaum':tree((0,1.0,0.95),(run0,1.05,1.0),(fz1,1.6,0.95),(1,1.6,0.95)),
  'dummy':[K(0,-1.3,1.6,'runbucket',125),K(run0,-1.3,1.6,'runbucket',125),K(fz1,0.35,0.15,'runbucket',125),K(1,0.75,-0.25,'runbucket',125)],
 },
 'freeze':fz1,
 'sfx':[{'t':0.03,'id':'eimer-schwappen','volume':0.6},{'t':r3(run0),'id':'schritte-rennen','volume':0.5},{'t':r3(fz1-0.05),'id':'feuer-auflodern','volume':0.7}],
}
# ---------------- Option 2: Geschenke
c_rauch=cue('explain2','und der Rauch ist giftig')
fz2=r3(c_rauch+0.04)
exp2={
 'camera':[cam(0,[-2.1,1.3,2.6],[1.0,0.45,-0.7]), cam(fz2,[-1.95,1.28,2.35],[1.0,0.45,-0.7]), cam(1,[-1.9,1.27,2.3],[1.0,0.45,-0.7])],
 'actors':{
  'weihnachtsbaum':tree((0,1.0,0.95),(fz2,1.05,1.5),(1,1.05,1.5)),
  'dummy':[K(0,1.0,-0.4,'pullgift',20)],
  'geschenke':[K(0,0.3,-0.25,'park',160)],
 },
 'freeze':fz2,
 'sfx':[{'t':0.08,'id':'geschenk-rascheln','volume':0.6},{'t':0.4,'id':'geschenk-rascheln','volume':0.5}],
}
# ---------------- Option 3: raus, Tür zu, 112
c_tuer=cue('explain3','schließ die Tür')
c_bremst=cue('explain3','Das bremst')
c_leave=cue('explain3','Verlass die Wohnung')
c_call=cue('explain3','ruf die 112')
c_wait=cue('explain3','Dann warte draußen')
cut1=r3(max(0.1,c_tuer-0.07))
cut2=r3(c_leave+0.05)
cutB=r3(c_wait-0.05)
dt=r3(1/ (seclen('explain3')))  # Anteil für 1 s
# Raum: zur Tür gehen
room_actors_d=[K(0,0.2,0.2,'stand',290),K(0.02,0.2,0.2,'walk',290),K(cut1-0.004,-2.5,0.75,'walk',270)]
# Flur
fd=cut1
door_close0=r3(max(fd+1.3*dt, c_tuer+0.2*dt))
hall_d=[K(fd,1.75,-0.8,'walk',270),K(r3(fd+1.0*dt),0.55,-0.75,'walk',300),K(r3(fd+1.0*dt+0.003),0.55,-0.75,'closedoor',345),
        K(r3(door_close0+1.3*dt),0.55,-0.75,'closedoor',345),K(r3(door_close0+1.3*dt+0.003),0.55,-0.75,'walk',330),
        K(r3(cut2-0.9*dt),0.0,-2.55,'walk',0),K(cut2-0.004,0.0,-3.4,'walk',0)]
# draußen A: rausrennen, telefonieren
oa=cut2
out_d=[K(oa,0.0,-3.2,'run',180),K(r3(oa+2.3*dt),0.5,4.2,'run',175),K(r3(oa+2.3*dt+0.003),0.5,4.2,'call',175),
       K(r3(cutB-0.003),0.5,4.2,'call',150),K(cutB,0.5,4.2,'callwave',150),K(1,0.5,4.2,'callwave',165)]
# Dummy-Gesamtliste mit Bühnen-Wechseln (versteckt per y -30 nicht nötig: gleiche Figur, Sprung beim Schnitt)
dummy3=[dict(k) for k in room_actors_d]+hall_d+out_d
HIDE=-30
def hidden(name, keys_visible, t0, t1, base):
    """Objekt nur zwischen t0 und t1 zeigen"""
    out=[dict(base,t=0,y=HIDE)]
    out.append(dict(base,t=r3(t0-0.002),y=HIDE)); 
    for k in keys_visible: out.append(dict(base,**k))
    out.append(dict(base,t=r3(t1),y=keys_visible[-1].get('y',0), **{kk:vv for kk,vv in keys_visible[-1].items() if kk not in('t','y')}))
    out.append(dict(base,t=r3(t1+0.002),y=HIDE))
    out.sort(key=lambda d:d['t'])
    return out
zt_base={'x':1.2,'z':-1.25,'face':270,'motion':'park'}
zt=[dict(zt_base,t=0,y=HIDE,door=1,smoke=1.2),dict(zt_base,t=r3(fd-0.002),y=HIDE),dict(zt_base,t=fd,y=0,door=1),
    dict(zt_base,t=door_close0,y=0,door=1),dict(zt_base,t=r3(door_close0+0.8*dt),y=0,door=0),dict(zt_base,t=r3(cut2-0.002),y=0,door=0),dict(zt_base,t=cut2,y=HIDE,door=0)]
wt_base={'x':-0.47,'z':-3,'face':180,'motion':'park'}
wt=[dict(wt_base,t=0,y=HIDE,door=0),dict(wt_base,t=r3(fd-0.002),y=HIDE),dict(wt_base,t=fd,y=0,door=0),dict(wt_base,t=r3(cut2-1.4*dt),y=0,door=0),
    dict(wt_base,t=r3(cut2-0.7*dt),y=0,door=1),dict(wt_base,t=r3(cut2-0.002),y=0,door=1),dict(wt_base,t=cut2,y=HIDE,door=1)]
ht_base={'x':-0.52,'z':-4,'face':180,'motion':'park'}
ht=[dict(ht_base,t=0,y=HIDE,door=1),dict(ht_base,t=r3(cut2-0.002),y=HIDE,door=1),dict(ht_base,t=cut2,y=0,door=1),dict(ht_base,t=1,y=0,door=1)]
truck=[K(0,-30,9.4,'drive',90,y=0),K(cutB,-30,9.4,'drive',90),K(r3(cutB+0.07),-4,9.4,'drive',90),K(r3(cutB+0.13),3.2,9.4,'drive',90),K(r3(cutB+0.135),3.2,9.4,'park',90),K(1,3.2,9.4,'park',90)]
tree3=[K(0,TX,TZ,'park',180,fire=1,smoke=1.0,y=0),K(r3(cut1-0.002),TX,TZ,'park',180,y=0),K(cut1,TX,TZ,'park',180,y=HIDE),K(1,TX,TZ,'park',180,y=HIDE)]
exp3={
 'stage':[{'t':0,'stage':'weihnachtszimmer'},{'t':cut1,'stage':'flur'},{'t':cut2,'stage':'hauseingang'}],
 'camera':[cam(0,[0.4,1.55,4.6],[-1.6,1.05,0.4]),cam(r3(cut1-0.004),[0.2,1.5,4.3],[-2.1,1.05,0.6]),
           cam(cut1,[-0.5,1.75,5.0],[0.5,1.0,-1.2]),cam(r3(cut2-0.004),[-0.35,1.7,4.4],[0.2,1.0,-2.0]),
           cam(cut2,[1.6,1.7,9.6],[0.1,1.3,-1.0]),cam(r3(cutB-0.004),[1.3,1.65,8.6],[0.3,1.25,1.5]),
           cam(cutB,[-0.9,1.7,-2.3],[2.5,0.9,8]),cam(1,[-0.95,1.7,-2.6],[2.5,0.9,8])],
 'actors':{'dummy':dummy3,'weihnachtsbaum':tree3,'zimmertuer':zt,'wohnungstuer':wt,'haustuer':ht,'feuerwehrauto':truck},
 'sfx':[{'t':0.02,'id':'schritte-rennen','volume':0.35},{'t':r3(door_close0+0.6*dt),'id':'tuer-zu','volume':0.8},
        {'t':r3(cut2-1.3*dt),'id':'tuer-zu','volume':0.4},{'t':r3(c_call),'id':'handy-waehlen','volume':0.6},
        {'t':r3(cutB-0.06),'id':'sirene','volume':0.55}],
}
steps=[{'text':'Alle raus','cue':'Bring alle aus dem Raum'},{'text':'Tür schließen','cue':'schließ die Tür hinter dir'},
       {'text':'Wohnung verlassen','cue':'Verlass die Wohnung'},{'text':'112: Wo? Was? Wer in Gefahr?','cue':'ruf die 112'},
       {'text':'Draußen auf die Feuerwehr warten','cue':'Dann warte draußen auf die Feuerwehr'}]
outro={'stage':'hauseingang','camera':[cam(0,[-0.45,1.6,11.8],[0.4,2.0,2]),cam(1,[-0.4,1.6,11.4],[0.4,2.0,2])],
 'actors':{'dummy':[K(0,0.5,4.2,'wave',185)],'haustuer':[K(0,-0.52,-4,'park',180,door=1)],'feuerwehrauto':[K(0,6.5,9.4,'park',90)]}}

scen={
 'id':ID,'category':'feuer','stage':'weihnachtszimmer',
 'situation':{'speech':S['situation']},
 'options':[
  {'card':S['o1c'],'speech':S['o1s'],'dummyAction':'Dummy rennt mit dem Eimer Wasser zum brennenden Baum, die Flammen sind viel größer als er. Bild friert ein, rotes Aufleuchten.','explanation':S['e1'],'choreography':exp1},
  {'card':S['o2c'],'speech':S['o2s'],'dummyAction':'Dummy kniet unter dem brennenden Baum und zieht Geschenke hervor, der Rauch wird dichter. Bild friert ein, rotes Aufleuchten.','explanation':S['e2'],'choreography':exp2},
  {'card':S['o3c'],'speech':S['o3s'],'dummyAction':'Dummy verlässt den Raum, schließt die Tür (Rauch bleibt dahinter), verlässt die Wohnung, telefoniert draußen im Schnee, die Feuerwehr kommt. Grünes Aufleuchten.','explanation':S['e3'],'steps':steps,'choreography':exp3},
 ],
 'correctOption':3,
 'countdown':{'speech':S['countdown'],'screen':'Schreib 1, 2 oder 3 in die Kommentare'},
 'reveal':{'speech':S['reveal'],'screen':'Richtig ist Nummer 3'},
 'outro':{'speech':S['outro'],'screen':S['outro']},
 'sourceLine':'Quellen: Landesfeuerwehrverband Bayern · Stadt Köln · Stiftung Warentest',
 'sources':[
  {'name':'Landesfeuerwehrverband Bayern, Sicher durch die Weihnachtszeit','url':'https://www.lfv-bayern.de/media/filer_public/26/2e/262e28ce-8d1f-4718-be4d-bbaedc6b0f27/weihnachtszeit_flyer_druck.pdf'},
  {'name':'Stadt Köln, Brandschutz im Advent','url':'https://www.stadt-koeln.de/artikel/02226/index.html'},
  {'name':'Stiftung Warentest, Brandschutz an Weihnachten','url':'https://www.test.de/Brandschutz-zu-Hause-Damit-der-Adventskranz-nicht-abbrennt-4635183-0/'},
 ],
 'publishing':{
  'description':"Dein Weihnachtsbaum steht mal wieder in Flammen – was machst du jetzt? 🎄🔥 Schreib 1, 2 oder 3 in die Kommentare!\n\nQuellen:\nLandesfeuerwehrverband Bayern, Sicher durch die Weihnachtszeit: https://www.lfv-bayern.de/media/filer_public/26/2e/262e28ce-8d1f-4718-be4d-bbaedc6b0f27/weihnachtszeit_flyer_druck.pdf\nStadt Köln, Brandschutz im Advent: https://www.stadt-koeln.de/artikel/02226/index.html\nStiftung Warentest, Brandschutz an Weihnachten: https://www.test.de/Brandschutz-zu-Hause-Damit-der-Adventskranz-nicht-abbrennt-4635183-0/\n\nTipp: Echte Kerzen nie unbeaufsichtigt lassen. Im Notfall: 112.\n\n#waswürdestdutun #weihnachten #weihnachtsbaum #brandschutz #feuerwehr #advent #survival #quiz",
  'pinnedComment':"Ehrlich: Wer hätte zuerst die Geschenke gerettet? 🎁👇 Und was soll dem Dummy an Silvester passieren?",
 },
 'shots':{'situation':situation,'options':options,'countdown':countdown,'reveal':reveal,'outro':outro},
}
json.dump(scen,open(f'{ROOT}/scenarios/{ID}.json','w'),ensure_ascii=False,indent=2)
print('cues',dict(deck=c_deck,aber=c_aber,rauch=c_rauch,tuer=c_tuer,leave=c_leave,call=c_call,wait=c_wait,cut1=cut1,cut2=cut2,cutB=cutB,len3=seclen('explain3')))
