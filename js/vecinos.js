/* «134 vecinos» · el plano del concejo de Pesoz y un punto de luz por vecino.
   window.Palleira.vecinos.montar(el, { movimiento, densidad }) -> { destruir() }
   Los datos (INE + OpenStreetMap) los mete scripts/mapa-construir.mjs entre los marcadores de abajo; no se editan a mano.
   Escucha `palleira:fechas` y enciende junto a la casa tantos puntos como personas. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var D = /*DATOS:INICIO*/ {"habitantes":134,"anyo":2025,"fecha_referencia":"2024-12-31","empate":["Yernes y Tameza"],"fuente":"INE, Cifras oficiales de población (padrón a 1 de enero de 2025)","plano":{"w":929,"h":1294,"escala_m_por_unidad":8,"limite":"M328 54L328 54Z","limite_sueltos":[],"rios":[{"nombre":"Río Navia","d":"M724 1158L735 1154L749 1144L773 1113L786 1086L793 1048L786 997L782 993L776 992L761 999L749 996L743 990L740 981L739 965L746 951L765 934L782 904L784 888L782 863L789 842L803 831L813 827L827 815L836 804L851 777L887 649L888 640L884 629L874 613L866 606L856 575L854 560L884 496L885 469L873 446L846 410L845 387L875 251L885 232L895 224L904 219L918 219L934 211L938 184L932 145L932 111L948 66L948 49L939 32L909 6L878 0L821 -16L791 -38L775 -40L764 -33L747 -2L728 12L708 23L685 25L670 21L667 11L672 -3L672 -21L669 -35L653 -49L609 -71L605 -86L609 -96L620 -102L639 -106L668 -146L680 -176L686 -202L691 -210L703 -211L719 -204L739 -200L765 -201L793 -208L812 -227L822 -244L827 -275L821 -293L809 -310L801 -327L812 -368L830 -391L843 -414L843 -439L833 -460L803 -482L797 -493L799 -506L839 -529L850 -542L857 -556L849 -564L814 -569L808 -583L810 -598L839 -629L845 -655L862 -699L869 -738L872 -773L883 -798L887 -834L877 -864L877 -896L890 -912L902 -916L925 -914L926 -924"},{"nombre":"Río Agüeira","d":"M112 1144L117 1147L112 1161L136 1191L140 1200L130 1217L130 1222L147 1232L161 1258L168 1257L171 1252L162 1244L162 1238L177 1216L205 1201L204 1178L206 1174L213 1168L223 1169L236 1163L245 1163L254 1147L264 1142L261 1129L247 1100L247 1077L252 1077L256 1083L264 1080L271 1070L295 1067L303 1054L322 1046L326 1037L327 1000L333 977L358 941L357 936L351 934L348 929L349 922L345 906L346 881L354 869L377 845L382 831L380 811L385 804L420 781L434 763L437 755L474 714L507 699L522 685L551 675L580 651L583 645L570 629L574 622L592 609L621 601L638 606L654 605L671 602L681 595L697 570L703 544L698 523L689 509L682 487L683 455L677 435L669 420L662 390L662 383L674 349L687 340L727 342L791 338L818 329L860 320"}],"agua":[{"nombre":"Embalse de Doiras","d":"M903 641L903 641Z"}],"carreteras":{"principales":["M394 905L385 911L381 918L378 932L378 938L381 945L379 958L376 960L370 970L363 973L353 987L347 991L340 1004L339 1028L341 1038L333 1046L332 1055L329 1058L324 1057L311 1059L305 1064L303 1069L295 1075L288 1076L280 1073L275 1073L266 1084L258 1087L254 1085","M661 381L667 384","M667 384L669 396L678 421L687 437L691 448L692 481L696 493L707 508L713 513L719 538L736 554L739 561L738 569L734 576L727 581L721 594L711 595L705 598L704 612L700 621L692 622L680 631L674 631L665 634L657 627L653 626L643 630L636 625L627 623L623 624L615 630L614 639L616 650L614 665L618 678L617 684L619 695L619 700L615 703L612 704L607 698L598 697L589 690L570 695L554 705L536 710L523 720L511 723L508 726L507 733L499 735L488 742L483 746L478 757L471 758L467 761L458 773L453 786L442 800L428 814L428 817L436 828L447 839L452 840L453 844L439 851L436 859L435 871L427 876","M427 876L426 884L423 890L422 903L409 924L406 926L394 927L393 938L396 943L399 957L396 978L393 987L394 988L397 988L397 983L412 949L412 940L416 940L417 944L406 999L399 1013L395 1015L391 1020L392 1028L400 1044L400 1057L402 1064L402 1067L398 1073L400 1086L404 1092L425 1109L425 1112L424 1115L413 1122L406 1123L403 1126L401 1134L399 1135L381 1134L375 1130L366 1130L363 1132L356 1143L355 1151L358 1160L367 1171L374 1171L380 1177L392 1178L399 1176L403 1179L404 1195L399 1207L406 1217L429 1221","M707 1148L709 1160L716 1174","M580 1407L580 1405L588 1399L607 1378L609 1369L617 1369L621 1371L629 1366L635 1366L642 1362L648 1348L653 1341L651 1327L657 1322L660 1317L662 1303L661 1290L667 1266L668 1247L666 1244L658 1241L649 1246L617 1246L614 1242L617 1238L635 1229L645 1218L657 1210L658 1206L653 1201L653 1197L663 1190L664 1185L661 1180L665 1175L669 1173L671 1166L677 1161L678 1158L683 1153L692 1148L696 1141L699 1141L706 1145L707 1148","M255 1079L252 1072L247 1072L240 1081L234 1098L234 1101L240 1108L252 1132L253 1136L251 1140L238 1148L228 1148L221 1151L202 1154L191 1164L176 1192L168 1200L163 1201L159 1196L161 1190L160 1176L154 1164L144 1160L140 1155L143 1140L141 1123L138 1117L128 1107L128 1103L133 1090L124 1071L122 1052L118 1046L116 1039L102 1023L95 1020L90 1006L89 996L84 995L73 1002L58 1006L55 1004L43 976L17 962L5 962L3 964L5 975L3 986L-9 998L-10 1004L-14 1011L-19 1013L-37 1014L-49 1012L-77 1012L-81 1016L-79 1034L-83 1040L-112 1055L-138 1055L-141 1050L-135 1033L-135 1000L-137 998L-141 998L-146 1003L-151 1002L-160 988L-171 981L-179 980L-193 987L-196 986L-201 979L-208 977L-219 976L-227 979L-237 979L-241 977L-246 971L-249 960L-249 945L-261 938L-266 926L-279 907L-294 902L-297 899L-302 877L-305 871L-315 864L-321 863L-333 866L-341 860L-348 821L-342 793L-344 787L-352 781L-363 777L-380 776","M254 1085L255 1079","M427 876L423 877L418 888L412 896L398 902","M398 902L394 905","M504 -165L499 -161L499 -154L506 -140L505 -133L501 -127L482 -113L481 -103L488 -82L483 -66L475 -55L474 -51L478 -43L479 -31L481 -29L491 -31L517 -48L524 -47L535 -37L537 -33L532 -20L535 -1L531 19L524 34L518 40L512 41L510 45L512 51L529 57L530 61L528 73L531 76L538 75L571 63L595 48L599 49L601 51L598 68L600 83L605 85L609 82L614 82L633 97L635 106L644 111L662 104L667 104L679 109L686 110L691 118L695 120L717 109L721 109L732 114L746 111L750 101L755 97L777 94L783 91L792 84L802 72L808 72L820 79L827 77L844 67L857 63L868 66L875 72L875 77L871 89L873 120L870 125L870 131L874 142L878 146L882 154L884 166L872 181L860 186L852 187L838 203L840 219L834 227L836 244L834 251L830 256L832 270L831 282L827 288L818 292L783 289L776 295L762 301L742 306L731 315L726 317L716 317L713 314L712 308L709 303L703 303L695 312L682 312L670 303L666 306L666 310L661 316L654 317L633 313L620 305L618 302L599 304L593 307L577 304L573 307L575 314L585 314L593 317L609 311L616 315L627 325L640 329L647 335L653 335L663 340L666 348L666 353L664 366L660 375L661 381"],"locales":["M447 1241L434 1221L434 1217L440 1212L443 1207L446 1205L460 1207L463 1202L467 1200L477 1205L481 1209L489 1209L489 1207L480 1198L465 1187L454 1164L452 1142L456 1135L460 1132L462 1123L479 1113L480 1104L474 1095L474 1089L486 1072L488 1061L483 1056L472 1053L461 1044L461 1041L485 1000L499 993L516 978L529 970L538 960L546 959","M294 1118L310 1110L319 1094L330 1083L338 1083L373 1092L372 1085L369 1081L366 1065L368 1058L373 1054L378 1054L379 1051L380 1044L377 1033L370 1020L370 1016L376 1006L380 1004","M380 1004L394 988","M651 698L652 699L658 697","M482 783L482 778","M642 699L639 709","M720 589L717 584L714 584","M479 792L481 791L483 786","M595 694L594 695L596 697L606 701L607 706L611 711L619 715L625 713L629 707L642 700L642 696L639 694L639 683L640 669L644 658","M485 779L484 784","M642 696L645 695L646 697L651 698L645 704L644 710","M726 585L726 590","M733 584L730 588L722 593","M652 678L644 688L644 692L641 695","M725 587L722 589L714 589L713 585","M482 783L497 778","M645 695L643 694","M721 594L716 593","M452 840L447 834L446 827L449 815L459 805L469 801L476 795L483 781L491 773L493 766L499 760L537 756L561 767L564 759L562 749L564 745L568 739L580 732L598 734L605 737L608 742L610 756L615 756L627 752L633 745L637 745L643 732L648 727L656 725L651 707L658 697L653 688L652 677L644 658L648 646L656 644L662 647L674 643L688 637L707 625L713 603L719 599L727 598L716 597L715 595","M420 867L417 870L416 876","M403 873L413 875L419 879L422 879","M415 876L415 883L417 885","M420 860L417 863L415 862","M424 856L429 868","M415 892L417 894L417 898","M426 873L430 867","M409 898L414 887L417 885L418 878","M415 881L418 880","M417 894L418 891","M66 998L69 998L85 989L92 987L93 1005L97 1016L95 1017L92 1011","M67 998L66 1000L61 1000L56 1004","M56 992L59 996L66 998","M272 1015L271 1013L274 1007","M157 1170L167 1177L171 1178L171 1173L167 1171L167 1169L175 1165L177 1157L189 1137L188 1133L182 1126L182 1113L185 1096L195 1069L209 1049L212 1033L218 1030L222 1034L228 1035L251 1028L257 1024L260 1016L267 1017L276 1014L282 1003","M439 876L437 878L427 876","M573 310L565 308L560 302L552 303L544 299L523 294L514 290L503 294L503 296L513 294L522 302L534 308L538 313L533 310L505 306L504 308L525 316L532 321L529 319L504 316L501 316L495 321L488 315L481 316L478 314L476 302L473 298L458 298L447 304L442 310L435 314L424 317L415 323L400 341L393 353L390 355L383 371L383 378L365 379L369 370L369 366L363 357L364 348L360 322L361 315L346 320L336 321L318 326L303 325L303 316L309 306L308 302","M412 866L420 867","M277 1012L281 1009L284 1003","M427 862L430 863L434 849L437 845L446 846L451 844L451 841L447 839","M550 966L552 967L556 963L552 957L546 954","M653 804L653 815L647 831L606 846L598 846","M318 326L327 320","M315 326L297 332","M648 833L652 838","M536 974L540 974L545 971L546 968L542 965","M610 756L613 759L644 753L646 749L660 740L664 741L667 744L670 744L675 738L680 735L687 733L688 736L679 742L670 762L664 771L657 787L652 806L644 814L626 824L614 828L605 843L598 846L601 851L587 858L576 880L570 886L570 898L568 906L562 921L557 928L551 948L548 953L546 955L544 954L536 945L525 939L515 941L499 950L496 946L497 943L504 941L509 936L520 917L526 911L524 908L520 908L512 921L508 925L504 925L501 922L500 914L491 903L486 899L478 898L465 906L453 906L442 912L431 932L419 943L415 956","M546 955L546 959L536 974L534 982L542 992L557 995L560 997","M641 834L647 834L649 831L648 830","M550 969L549 974L543 979","M557 995L552 991L551 994","M549 971L547 969","M704 1076L695 1077L686 1072L686 1068L674 1055L667 1042L655 1040L649 1034L637 1032L630 1015L625 1009L609 1010L605 1003L601 1000L588 995L566 999L560 997","M494 633L493 638","M483 636L479 639","M488 640L492 638","M496 639L491 637L492 633","M486 642L488 640L483 637","M488 636L486 638","M488 742L483 744L476 753L467 755L462 758L451 770L448 776L440 781L437 789L427 796L412 802L408 808L407 814L405 815L398 806L391 811L388 815L389 828L379 847","M374 850L372 849","M372 849L378 832L373 812L374 809L383 793L390 786L396 776L406 767L408 755L418 748L420 741L418 722L422 721L428 725L432 724L450 704L445 691L457 687L472 672","M485 632L499 609L491 596L496 588L492 584L492 581L501 577L511 568L510 565L502 565L506 556L507 549L501 544L499 540L512 536L514 532L513 528L515 526L524 525L534 520L536 517L535 513L543 510L547 504L559 502L574 496L586 487L586 482L578 476L572 462L564 451L559 447L547 442L548 440L571 433L579 427L581 424L583 406L581 392L580 390L576 389L559 390L550 378L544 363L523 355L522 344L520 342L503 335L490 337L480 331L470 333L465 327L463 317L460 316L422 335L403 348L390 361L390 355","M472 672L482 660L482 654L486 642L483 637L483 634L485 632","M379 847L374 850","M424 870L420 860","M424 870L426 876","M417 863L424 870","M434 877L425 886","M434 872L437 877","M430 872L427 871","M607 1007L605 993L597 984L582 979L571 983L561 983L556 981L546 982L543 979","M546 982L555 992","M600 851L623 846L640 834","M664 1188L658 1178L666 1172L669 1160L672 1159L677 1151L679 1151L687 1143L688 1132L694 1128L700 1128L704 1130L709 1136L728 1124","M551 987L539 988","M499 609L498 617L493 630","M547 959L549 955"]},"nucleos":[{"nombre":"Pelorde","x":721,"y":588,"tipo":"hamlet"},{"nombre":"Vilabriye","x":644,"y":699,"tipo":"hamlet"},{"nombre":"Pesoz","x":427,"y":876,"tipo":"hamlet"},{"nombre":"Cabanela","x":290,"y":1114,"tipo":"hamlet"},{"nombre":"Francos","x":480,"y":790,"tipo":"hamlet"},{"nombre":"Lixóu","x":424,"y":318,"tipo":"hamlet"},{"nombre":"Vilarmarzo","x":278,"y":1011,"tipo":"hamlet"},{"nombre":"Brañaveya","x":313,"y":325,"tipo":"hamlet"},{"nombre":"Serán","x":648,"y":832,"tipo":"hamlet"},{"nombre":"Sanzo","x":545,"y":969,"tipo":"hamlet"},{"nombre":"Cela","x":388,"y":993,"tipo":"hamlet"},{"nombre":"Argul","x":488,"y":639,"tipo":"hamlet"},{"nombre":"A Paicega","x":699,"y":1073,"tipo":"hamlet"}],"etiquetas":[{"nombre":"Pesoz","x":427,"y":950,"anc":"middle"},{"nombre":"Argul","x":497,"y":644,"anc":"start"},{"nombre":"A Paicega","x":708,"y":1078,"anc":"start"},{"nombre":"Pelorde","x":730,"y":593,"anc":"start"},{"nombre":"Lixóu","x":433,"y":323,"anc":"start"},{"nombre":"Brañaveya","x":322,"y":330,"anc":"start"},{"nombre":"Cabanela","x":299,"y":1119,"anc":"start"},{"nombre":"Vilarmarzo","x":287,"y":1016,"anc":"start"},{"nombre":"Serán","x":657,"y":837,"anc":"start"},{"nombre":"Vilabriye","x":653,"y":704,"anc":"start"},{"nombre":"Francos","x":489,"y":795,"anc":"start"},{"nombre":"Cela","x":397,"y":998,"anc":"start"},{"nombre":"Sanzo","x":554,"y":974,"anc":"start"}],"casa":{"x":429,"y":882},"pesoz":{"x":427,"y":876}}} /*DATOS:FIN*/;
  var P = window.Palleira = window.Palleira || {};

  // Último `palleira:fechas` conocido: el módulo se monta al acercarse a la pantalla y la reserva puede haber hablado antes.
  var ultimo = null;
  document.addEventListener('palleira:fechas', function (e) { ultimo = e.detail || null; });

  function svg(tag, attrs, padre) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (padre) padre.appendChild(n);
    return n;
  }
  function html(tag, clase, texto, padre) {
    var n = document.createElement(tag);
    if (clase) n.className = clase;
    if (texto != null) n.textContent = texto;
    if (padre) padre.appendChild(n);
    return n;
  }
  function mulberry(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* Un punto por vecino: «mejor candidato» (cada nuevo punto, el más alejado de los ya puestos) en un disco alrededor
     de la villa de Pesoz, sin pisar la casa. Semilla fija: siempre el mismo reparto. */
  function repartir(n, cx, cy, radio, casa) {
    var rnd = mulberry(134), pts = [];
    for (var i = 0; i < n; i++) {
      var mejor = null, dm = -1;
      for (var c = 0; c < 14; c++) {
        var a = rnd() * 6.2832, r = radio * Math.sqrt(rnd()), x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        if (Math.hypot(x - casa.x, y - casa.y) < 17) continue;
        var d = 1e9;
        for (var j = 0; j < pts.length; j++) d = Math.min(d, Math.hypot(x - pts[j][0], y - pts[j][1]));
        if (d > dm) { dm = d; mejor = [x, y]; }
      }
      if (!mejor) mejor = [cx + (rnd() - 0.5) * radio * 2, cy + (rnd() - 0.5) * radio * 2];
      pts.push(mejor);
    }
    return pts;
  }

  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function trozos(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? { a: +m[1], m: +m[2] - 1, d: +m[3] } : null; }
  function rango(e, s) {
    var a = trozos(e), b = trozos(s);
    if (!a || !b) return '';
    if (a.a === b.a && a.m === b.m) return 'Del ' + a.d + ' al ' + b.d + ' de ' + MESES[a.m];
    return 'Del ' + a.d + ' de ' + MESES[a.m] + ' al ' + b.d + ' de ' + MESES[b.m];
  }

  function montar(el, opciones) {
    if (!el || !D.plano) return { destruir: function () {} };
    opciones = opciones || {};
    var reducido = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var mov = opciones.movimiento !== false && opciones.densidad !== 'sobria' && !reducido;
    var plano = D.plano, N = D.habitantes, MAX = 4;

    el.textContent = '';
    var raiz = html('div', 'vc' + (mov ? ' vc--mov' : ''), null, el);
    var cuerpo = html('div', 'vc-cuerpo', null, raiz);

    // ---- texto
    var txt = html('div', 'vc-texto', null, cuerpo);
    html('p', 'vc-sobre', 'Pesoz · Asturias · padrón de ' + D.anyo, txt);
    var num = html('p', 'vc-num', null, txt);
    var valor = html('span', 'vc-valor', String(N), num);
    html('span', 'vc-unidad', ' vecinos', num);
    var frase = html('p', 'vc-frase', null, txt);
    var empate = (D.empate && D.empate.length) ? D.empate[0] : null;
    frase.textContent = empate
      ? 'Pesoz tiene ' + N + ' vecinos, los mismos que ' + empate + ': los dos son el concejo menos poblado de Asturias.'
      : 'Pesoz es el concejo con menos vecinos de Asturias: ' + N + '.';
    var estado = html('p', 'vc-estado', null, txt);
    estado.setAttribute('role', 'status');
    estado.setAttribute('aria-live', 'polite');
    var leyenda = html('ul', 'vc-leyenda', null, txt);
    leyenda.setAttribute('aria-hidden', 'true');
    html('li', 'vc-ley vc-ley--vecino', 'Vecinos del padrón', leyenda);
    html('li', 'vc-ley vc-ley--viene', 'Quienes vienen en tus fechas', leyenda);
    html('p', 'vc-fuente', 'Fuente: ' + D.fuente + '. El INE no da cifras por aldea en sus tablas abiertas: los puntos se agrupan en torno a la villa de Pesoz, no en cada núcleo. Plano de OpenStreetMap.', txt);

    // ---- plano
    var fig = html('figure', 'vc-plano', null, cuerpo);
    var s = svg('svg', { viewBox: '0 0 ' + plano.w + ' ' + plano.h, 'aria-hidden': 'true', focusable: 'false', preserveAspectRatio: 'xMidYMid meet' }, fig);
    var defs = svg('defs', null, s);
    var gr = svg('radialGradient', { id: 'vc-halo' }, defs);
    svg('stop', { offset: '0', 'stop-color': '#F6EBD3', 'stop-opacity': '.55' }, gr);
    svg('stop', { offset: '1', 'stop-color': '#F6EBD3', 'stop-opacity': '0' }, gr);
    var cl = svg('clipPath', { id: 'vc-recorte' }, defs);
    svg('path', { d: plano.limite }, cl);

    var gAgua = svg('g', { 'class': 'vc-agua', 'clip-path': 'url(#vc-recorte)' }, s);
    plano.agua.forEach(function (a) { svg('path', { d: a.d }, gAgua); });
    var gRios = svg('g', { 'class': 'vc-rios', 'clip-path': 'url(#vc-recorte)' }, s);
    var lineas = [];
    function linea(d, clase, padre) { var p = svg('path', { d: d, pathLength: '1', 'class': clase }, padre); lineas.push(p); return p; }
    plano.rios.forEach(function (r) { linea(r.d, 'vc-rio', gRios); });
    var gRuta = svg('g', { 'class': 'vc-carreteras' }, s);
    plano.carreteras.locales.forEach(function (d) { linea(d, 'vc-via vc-via--local', gRuta); });
    plano.carreteras.principales.forEach(function (d) { linea(d, 'vc-via vc-via--principal', gRuta); });
    var lim = linea(plano.limite, 'vc-limite', s);
    (plano.limite_sueltos || []).forEach(function (d) { linea(d, 'vc-limite', s); });

    var gNuc = svg('g', { 'class': 'vc-nucleos' }, s);
    plano.nucleos.forEach(function (n) { svg('circle', { cx: n.x, cy: n.y, r: n.nombre === 'Pesoz' ? 3.6 : 2.6 }, gNuc); });
    plano.etiquetas.forEach(function (e) {
      var t = svg('text', { x: e.x, y: e.y, 'text-anchor': e.anc, 'class': 'vc-et' + (e.nombre === 'Pesoz' ? ' vc-et--pesoz' : '') }, gNuc);
      t.textContent = e.nombre;
    });

    // puntos de los vecinos
    var gPts = svg('g', { 'class': 'vc-puntos' }, s);
    var pts = repartir(N, plano.pesoz.x, plano.pesoz.y, 50, plano.casa);
    var ptsEls = pts.map(function (p, i) {
      var g = svg('g', { 'class': 'vc-pt', transform: 'translate(' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ')' }, gPts);
      svg('circle', { r: 8, fill: 'url(#vc-halo)', 'class': 'vc-pt-halo' }, g);
      svg('circle', { r: 2.9, 'class': 'vc-pt-nucleo' }, g);
      g.style.setProperty('--d', Math.round(1500 + (i / N) * 1900 + (i * 37 % 120)) + 'ms');
      if (mov && i % 9 === 4) { g.classList.add('vc-pt--par'); g.style.setProperty('--par', (5 + (i % 5)) + 's'); g.style.setProperty('--pard', '-' + (i % 7) + 's'); }
      return g;
    });

    // la casa
    var gCasa = svg('g', { 'class': 'vc-casa' }, s);
    var cx = plano.casa.x, cy = plano.casa.y;
    svg('path', { d: 'M' + cx + ' ' + cy + 'L' + (cx + 46) + ' ' + (cy - 54) + 'L' + (cx + 58) + ' ' + (cy - 54), 'class': 'vc-casa-hilo' }, gCasa);
    var tc = svg('text', { x: cx + 62, y: cy - 49, 'class': 'vc-casa-et' }, gCasa); tc.textContent = 'A Palleira';
    // los que vienen: espiral alrededor de la casa
    var gViene = svg('g', { 'class': 'vc-vienen' }, s);
    var vienen = [];
    for (var k = 0; k < MAX; k++) {
      var ang = -1.1 + k * 2.399, rad = 9.5 + Math.sqrt(k) * 5.4;
      var gv = svg('g', { 'class': 'vc-v', transform: 'translate(' + (cx + Math.cos(ang) * rad).toFixed(1) + ' ' + (cy + Math.sin(ang) * rad).toFixed(1) + ')' }, gViene);
      svg('circle', { r: 7.5, 'class': 'vc-v-anillo' }, gv);
      svg('circle', { r: 4.1, 'class': 'vc-v-pt' }, gv);
      gv.style.setProperty('--vd', (k * 110) + 'ms');
      vienen.push(gv);
    }
    svg('circle', { cx: cx, cy: cy, r: 4.6, 'class': 'vc-casa-pt' }, gCasa);

    // ---- el contador y las fechas
    var actual = N, destino = N, tic = 0, pasos = 0;
    function pintaNum(n) { valor.textContent = String(n); }
    function haciaDestino() {
      if (!mov) { actual = destino; pintaNum(actual); return; }
      clearTimeout(tic);
      (function paso() {
        if (actual === destino) return;
        actual += actual < destino ? 1 : -1; pintaNum(actual);
        tic = setTimeout(paso, 150);
      })();
    }
    function enlace(texto) {
      var a = html('a', 'vc-enlace', texto);
      a.setAttribute('href', '#reservar');
      a.setAttribute('data-reservar', '');
      a.addEventListener('click', function (ev) { if (P.reservar) { ev.preventDefault(); P.reservar(); } });
      return a;
    }
    function aplica(d) {
      var p = d && d.personas ? Math.max(0, Math.min(MAX, Math.round(+d.personas))) : 0;
      if (!d || !p) p = 0;
      vienen.forEach(function (g, i) { g.classList.toggle('vc-v--on', i < p); });
      raiz.classList.toggle('vc--con-fechas', p > 0);
      destino = N + p;
      haciaDestino();
      estado.textContent = '';
      if (p) {
        var r = rango(d.entrada, d.salida);
        estado.appendChild(document.createTextNode((r ? r + ', ' : 'Esas noches, ') + 'Pesoz tendrá ' + destino + ' vecinos: ' + p + (p === 1 ? ' más, contigo. ' : ' más, contigo y los tuyos. ')));
        estado.appendChild(enlace('Cambiar fechas'));
      } else {
        estado.appendChild(document.createTextNode('Elige fechas y te sumamos. '));
        estado.appendChild(enlace('Ver fechas'));
      }
      raiz.dataset.vienen = String(p);
      raiz.dataset.total = String(destino);
    }
    function alFechas(e) { aplica(e.detail || null); }
    document.addEventListener('palleira:fechas', alFechas);

    // ---- la entrada: el plano se traza y los puntos se encienden
    var visto = false, io = null;
    function mostrar() { if (visto) return; visto = true; raiz.classList.add('vc--visto'); }
    if (mov && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { mostrar(); io.disconnect(); } }, { threshold: 0.2 });
      io.observe(fig);
    } else mostrar();
    // pasos del trazo: los largos tardan más
    lineas.forEach(function (p, i) { p.style.setProperty('--t', (i % 7) * 70 + 'ms'); });
    lim.style.setProperty('--t', '0ms');

    aplica(ultimo);
    el.dataset.montado = '1';
    return { destruir: function () { document.removeEventListener('palleira:fechas', alFechas); clearTimeout(tic); if (io) io.disconnect(); el.removeAttribute('data-montado'); } };
  }

  P.vecinos = { montar: montar, datos: { habitantes: D.habitantes, anyo: D.anyo, fecha_referencia: D.fecha_referencia, empate: D.empate, fuente: D.fuente } };
})();
