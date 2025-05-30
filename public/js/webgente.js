/* Inicializando o mapa, initView é inicializado dentro de uma tag script do index.ejs pois recebe dados do backend */

var map = L.map('map',{
    zoomControl: false
}).setView([initView.lat, initView.lng], initView.zoom);

/* Adicionando botões de login e depois zoom */

var login = L.easyButton('fas fa-user-lock', 
    () => {
        window.location = '/login'
    },
    'Acesso às interfaces restritas');

/* Adicionando botão de logout e indicador de que o usuário está logado */
if (session != undefined && session != '') {
    var logout = L.easyButton({
        id: 'logout-button',
        position: 'topleft',
        states: [
            {
                stateName: 'logged-in',
                onClick: () => {
                    window.location = '/logout'
                },
                title: 'Sair da interface restrita',
                icon: 'fas fa-sign-out-alt'
            }
        ]
    })

    if (sessionGroup == 'admin') {
        var loginBar = [
            login, logout
        ]
    } else {
        var loginBar = [
            logout
        ]
    }   

    $('#user-div').html('Bem vindo, <b>' + session + '</b>!').css('visibility', 'visible');
} else {
    var loginBar = [
        login
    ]
}



L.easyBar(loginBar,{
    position: 'bottomright'
}).addTo(map)
L.control.zoom({
    position: 'topright'
}).addTo(map);

/* Adicionando escala gráfica ao mapa */

var optionsScale = {
    metric: true, //Define a unidade em m/km
    imperial: false //Define a unidade em mi/ft
};

L.control.scale(optionsScale).addTo(map);

/* Adicionando botão de ajuda */

var help = L.easyButton({
    id: 'webgente-help',
    position: 'bottomright',
    states: [
        {
            stateName: 'help',
            onClick: () => {
                window.open("https://www.webgente.genteufv.com.br", "_blank")
            },
            title: 'Me ajuda!',
            icon: 'fas fa-question'
        }
    ]
}).addTo(map)

/* Detectando dark mode */

if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    console.log('We are dark!')
} else {
    console.log('We are light!')
}

/* Camadas base do OpenStreetMaps e Google */

var osm = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    maxZoom: 22,
    maxNativeZoom: 19,
    noWrap: true,
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
});

osm.addTo(map); /* Adiciona a camada OSM ao mapa como padrão*/

var google = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
    maxZoom: 22,            // Permite zoom até 22 no Leaflet
    maxNativeZoom: 20,      // Tiles do Google normalmente vão até 20
    noWrap: true,           // Evita repetição do mapa no mundo
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
});

var topo = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 22,            
    maxNativeZoom: 19,      
    noWrap: true,           
});

/* Inicializa o Controle de Camadas com as Camadas Base Estáticas */

var baseMaps = {
    'OpenStreetMaps' : osm,
    'Google Satelite' : google,
    'Esri Topo' : topo
};

var overlayMaps = {};

var optionsControl = {
    collapsed: true,
    groupsCollapsable: true,
    groupCheckboxes: true, 
    position: 'topleft',

};

Lc = L.control.groupedLayers(baseMaps,overlayMaps,optionsControl).addTo(map);

var controlContainer = Lc.getContainer();
/*var menu = document.getElementById('menu');
menu.appendChild(controlContainer);*/

/* Lendo camadas da Base de Dados e adicionando ao controle */

function addMetadata (metadata) {
    
    if (metadata != "" && metadata != "none" && metadata != undefined) { // "" é o armazenamento de metadados até a 1.0, a partir da 1.1 o armazenamento sem metadados é denotado como 'none'
        if (metadata.split('/public')[1] != undefined) {
            metadata = metadata.split('/public')[1]
        } 
        return ' <a href="' + metadata + '" target="_blank" style="outline: none;"><i class="fas fa-info-circle"></i></a>'
    } else {
        return ''
    }
}

function addLayer (layer){
    
    if (layer.type == 1) { // Adiciona como Base

        var l = L.tileLayer.wms(layer.host,{
            layers: layer.layer,
            format: 'image/jpeg',
            transparent: false,
            attribution: layer.attribution,
            maxZoom: 22
        })
        if (layer.defaultBaseLayer == 1) {
            Lc.addBaseLayer(l, layer.layerName + addMetadata(layer.metadata));
            l.addTo(map);
        } else {
            Lc.addBaseLayer(l, layer.layerName + addMetadata(layer.metadata));
        };

    } else if (layer.type == 2) { // Adiciona como Overlay

        var l = L.tileLayer.gfiWMS(layer.host,{
            layers: layer.layer,
            format: 'image/png',
            transparent: true,
            maxZoom: 22
        });
        if (layer.defaultBaseLayer == 1) {
            Lc.addOverlay(l, layer.layerName + addMetadata(layer.metadata), layer.group);
            
            // O comportamento de defaultBaseLayer = true só é ativado se não houver indicação de camadas no hash
            if(window.location.hash == '') {
                l.addTo(map);
            }

        } else {
            Lc.addOverlay(l, layer.layerName + addMetadata(layer.metadata), layer.group);
        };
    
    } else if (layer.type == 3) { // Adiciona como MDT, modalidade de camada base com GetFeatureInfo
        
        var l = L.tileLayer.gfiWMS(layer.host,{
            layers: layer.layer,
            format: 'image/jpeg',
            transparent: false,
            tiled: false,
            attribution: layer.attribution,
            maxZoom: 22
        });
        if (layer.defaultBaseLayer == 1) {
            Lc.addBaseLayer(l, layer.layerName + ' <a href="' + layer.metadata + '" target="_blank" style="outline: none;"><i class="fas fa-info-circle"></i></a>');
            
            // O comportamento de defaultBaseLayer = true só é ativado se não houver indicação de camadas no hash
            if(window.location.hash == '') {
                l.addTo(map);
            }

        } else {
            Lc.addBaseLayer(l, layer.layerName + ' <a href="' + layer.metadata + '" target="_blank" style="outline: none;"><i class="fas fa-info-circle"></i></a>');
        };
    }
};

$.get('/listlayers',function(data){

    // Reorder data: 1 -> Type 1 data (basemaps), Type 3 data (dem's) and Type 2 data (overlays)
    baseLayers = [];
    overlayLayers = [];
    demLayers = [];

    for (i = 0; i < data.length ; i++) {
        if (data[i].type == 1) baseLayers.push(data[i]);
        if (data[i].type == 2) overlayLayers.push(data[i]);
        if (data[i].type == 3) demLayers.push(data[i]);
    }

    data = [].concat(baseLayers).concat(demLayers).concat(overlayLayers);

    for (let index = 0; index < data.length; index++) {
        const element = data[index];
        addLayer(element)
    }    
    existsBasemap(data);
    getMapStateFromURL();
},'json');

function existsBasemap(data){
    if (data.map(e => e.type).indexOf(1) == -1) { // If there's no Basemap enabled on /listlayers WebGENTE will automatically enable OSM
        osm.addTo(map);
    } else {
        return null
    }
}

/* Inicializando botões de ferramentas */

// Adicionando botão de set view para visao inicial
var home = L.easyButton('fas fa-home', function(btn, map){
    var initial = [initView.lat,initView.lng];
    map.setView(initial,initView.zoom);
},'Voltar o mapa à vista inicial',{
    position: "bottomright"
}).addTo(map);

// Adiciona o botao de seleção de feições
var select= false; // Variável que habilita a seleção de camadas
var selectButton = L.easyButton({
    states: [{
                stateName: 'select_disabled',
                icon:      '<i class="fas fa-hand-pointer" style="color: gray;"></i>',  
                title:     'Clique sobre um elemento de uma camada ligada para seleciona-lo',   
                onClick: function(btn) {       
                    selectButton.state('select_enabled');
                    btn.state('select_enabled');  
                    select=true;              
                    Lc.addOverlay(selectedLayers,'<a id="selected-download-link" href="" download="webgente-selected-data-'+new Date().getTime()+'.geojson" target="_blank" style="outline: none;">Download <i class="fas fa-cloud-download-alt"></i></a>','Dados selecionados')
                }
            }, {
                stateName: 'select_enabled',   
                icon:      '<i class="fas fa-hand-pointer"></i>',              
                title:     'Desabilita a ferramenta de seleção de feições',
                onClick: function(btn) {
                    selectButton.state('select_disabled');
                    btn.state('select_disabled'); 
                    select=false;   
                    Lc.removeLayer(selectedLayers)
                }
        }]
    });

// Adiciona o botao de visualizar informacoes com dois estados
var gfi = false; // Variável que habilita o GetFeatureInfo
var infoButton = L.easyButton({
    states: [{
                stateName: 'info_disabled',
                icon:      '<i class="fas fa-info-circle" style="color: gray;"></i>',     
                title:     'Clique sobre um elemento de uma camada ligada para visualizar seus atributos',   
                onClick: function(btn) {       
                    infoButton.state('info_enabled');
                    btn.state('info_enabled');  
                    gfi=true;  
                }
            }, {
                stateName: 'info_enabled',   
                icon:      'fas fa-info-circle',               
                title:     'Desabilita a ferramenta de visualização de atributos das camadas',
                onClick: function(btn) {
                    infoButton.state('info_disabled');
                    btn.state('info_disabled'); 
                    gfi=false;   
                }
        }]
    });

// Adiciona botao para ativar a ferramenta de pesquisas
var searchButton = L.easyButton({
    states: [{
                stateName: 'search_disabled',       
                icon:      '<i class="fas fa-search" style="color: gray;"></i>',     
                title:     'Pesquise elementos das camadas pelos seus atributos',   
                onClick: function(btn) {       
                    searchButton.state('search_enabled');
                    btn.state('search_enabled');  
                    document.getElementById('search').style.visibility = "visible";
                    $.get('/search', function(data) {
                    // Adiciona botão X ao topo
                    const closeBtn = `<button id="close-search" title="Fechar">×</button>`;
                    $('#search').html(closeBtn + data);

                    // Ativa o botão "X" para fechar a caixa de pesquisa
                    $('#close-search').on('click', function() {
                        searchButton.state('search_disabled');
                        document.getElementById('search').style.visibility = "hidden";
                        $('#search').html('');
                        closeTable();
                    });
                });
                }
            }, {
                stateName: 'search_enabled',   
                icon:      'fas fa-search',               
                title:     'Desabilita ferramenta de pesquisa por atributo nas camadas',
                onClick: function(btn) {
                    searchButton.state('search_disabled');
                    btn.state('search_disabled'); 
                    $('#search').html(" ")
                    closeTable()
                    document.getElementById('search').style.visibility = "hidden";
                     
                }
        }]
    });

// 
L.DomEvent.disableScrollPropagation(L.DomUtil.get('search'));

// Adiciona botão para habilitar ou desabilitar a legenda

var legendButton = L.easyButton({
    id: 'legend-button',
    states: [{
                stateName: 'legend_enabled',   
                icon:      'fas fa-bars',   
                title:     'Desabilita a legenda',
                onClick: function(btn) {
                    legendButton.state('legend_disabled');
                    btn.state('legend_disabled');
                    $('#webgente-legend-container').data('state','disabled');
                    checkLegendContainer()
                }
            }, {
                stateName: 'legend_disabled',
                icon:      '<i class="fas fa-bars" style="color: gray;"></i>',             
                title:     'Habilita a legenda',   
                onClick: function(btn) {       
                    legendButton.state('legend_enabled');
                    btn.state('legend_enabled');
                    $('#webgente-legend-container').data('state','enabled')
                    checkLegendContainer()
                }
        }]
    });

/* Geolocalização */

var geolocationButton = L.easyButton({
    id: 'geolocationButton',
    states: [{
            stateName: 'geolocation_disabled',
            icon:      '<i class="fas fa-map-marker-alt" style="color: gray;"></i>', 
            title:     'Onde estou?',   
            onClick: function(btn) {       
                geolocationButton.state('geolocation_enabled');
                btn.state('geolocation_enabled');
                map.locate({setView: true, watch: true, maxZoom: 20});
            }
        },
        {
            stateName: 'geolocation_enabled',   
            icon:      'fas fa-map-marker-alt',              
            title:     'Parar de me seguir',
            onClick: function(btn) {
                geolocationButton.state('geolocation_disabled');
                btn.state('geolocation_disabled');
                map.stopLocate()
            }
        }]
    });

var locationMarker = null;

function onLocationFound(e) {
    if (locationMarker !== null) { // Remove marker anterior
        map.removeLayer(locationMarker);
    }
    L.marker(e.latlng).addTo(map)
    .bindPopup('Você está aqui: ' + e.latlng)
    console.log('Geolocalização encontrada')
}

function onLocationError(e) {
    alert(e.message);
    console.log('Geolocalização não encontrada')
}

map.on('locationfound', onLocationFound);
map.on('locationerror', onLocationError);

// Adiciona botão para habilitar ou desabilitar ferramentas de medição

var measurementButton = L.easyButton({
    id: 'measurementButton',
    states: [{
                stateName: 'measurement_enabled',   
                icon:      '<i class="fas fa-ruler" style="color: gray;"></i>', 
                title:     'Clique para abrir as ferramentas de medição de distâncias e áreas',
                onClick: function(btn) {
                    measurementButton.state('measurement_disabled');
                    btn.state('measurement_disabled');
                    document.getElementsByClassName('leaflet-draw-toolbar')[0].style.visibility = 'visible'
                    tooltipForDrawing()
                }
            }, {
                stateName: 'measurement_disabled',
                icon:      'fas fa-ruler',
                title:     'Desabilita as ferramentas de medição',   
                onClick: function(btn) {       
                    measurementButton.state('measurement_enabled');
                    btn.state('measurement_enabled');
                    document.getElementsByClassName('leaflet-draw-toolbar')[0].style.visibility = 'hidden'
                }
        }]
    });

/* Manutenção de camadas pelo nome de chamada no LayerControl */

function addLayerByName(nameString) {
	Lc._layers.find(x => x.layer.options.layers === nameString).layer.addTo(map)
	return null
};

function removeLayerByName(nameString) {
	Lc._layers.find(x => x.layer.options.layers === nameString).layer.remove()
	return null
};

/* Verificação de camadas e coordenadas no HASH e atualização do mapa com as informações */

var activeLayers = []; // Variável global com camadas ativas e GetFeatureInfo habilitado

function setMapStateInURL() {
    
    if(activeLayers.length != 0) {
        window.location.hash = '/'+ map.getCenter().lat + '/' + map.getCenter().lng + '/' + map.getZoom() + '/' + activeLayers.join(',')
    } else {
        window.location.hash = '/'+ map.getCenter().lat + '/' + map.getCenter().lng + '/' + map.getZoom()
    }   
};

map.on("moveend", function () {
    setMapStateInURL()
});

map.on("zoomend", function () {
    setMapStateInURL()
});

function getMapStateFromURL () {
    if (window.location.hash != '') {

        var url = window.location.hash.split('/')
        map.setView([url[1],url[2]],url[3])
    
        if (url[4] != undefined) { // Se houverem camadas na URL, ativa-las
           
            layersFromURL = url[4].split(',')
            for(i = 0; i < layersFromURL.length; i++) {
                addLayerByName(layersFromURL[i])
            }
        }
    }
};

/* Exibição de coordenadas no mapa - Toda definição parte do código epsgCode
A coordenada é transformada e exibida no sistema definido, sendo criado um
link para a pagina do epsg.io para este também! */

epsgCode = referenceSystem;

var projectionFromEPSG = '+proj=longlat +datum=WGS84 +no_defs' ; // Default para inciialização sem erros no console

/* Requisicao para recuperar projeção via código EPSG */
$.get('https://epsg.io/'+ epsgCode +'.proj4 ',results => {projectionFromEPSG = results;})

function coordinatesOnMouseMove() {
    /* Criando o evento de mousemove para atualização do código */ 
    map.on("mousemove",function (e) {
        
        lat = e.latlng.lat;
        lng = e.latlng.lng;

        projected = proj4(projectionFromEPSG,[lng,lat])

        n = projected[1].toFixed(3);
        e = projected[0].toFixed(3);

        // Atualizando conteudo do container
        $('#webgente-coordinates-container').html('<i onclick="searchByCoordinates()" class="fas fa-search webgente-search-coordinates"></i> N: ' + n + '; ' + 'E: ' + e + ' <a target="_blank" href="https://epsg.io/' + epsgCode + '">(EPSG:' + epsgCode + ')</a>')
        
        // Atualizando padding do panel com base na largura da escala gráfica
        scaleMargin = document.getElementsByClassName('leaflet-control-scale')[0].clientWidth + 5
        $('#webgente-coordinates-panel').css('padding-left', scaleMargin + 10)
    })
}

coordinatesOnMouseMove();

function goToCoordinates() {
    if (isNaN(Number($('#x-coordinate').val())) || isNaN(Number($('#y-coordinate').val()))) {
        alert("Coordenada inválida! Certifique-se de que os valores inseridos são números válidos.")
    } else {
        unprojected = proj4(projectionFromEPSG).inverse([Number($('#x-coordinate').val()), Number($('#y-coordinate').val())]);

        map.panTo([unprojected[1], unprojected[0]], { animate: true });

        coordinatesOnMouseMove();
    }
}

function searchByCoordinates() {

    map.off('mousemove');

    var url = window.location.hash.split('/')

    centerOfMap = proj4(projectionFromEPSG).forward([Number(url[2]),Number(url[1])])

    form =  'N: <input class="webgente-coordinate-input webgente-search-form" type="text" name="y" id="y-coordinate" value='+centerOfMap[1].toFixed(3)+'> E: <input class="webgente-coordinate-input webgente-search-form" type="text" name="x" id="x-coordinate" value='+centerOfMap[0].toFixed(3)+'> <i onclick="goToCoordinates()" class="fas fa-search webgente-search-coordinates"></i>'

    $('#webgente-coordinates-container').html( form + ' <a target="_blank" href="http://epsg.io/' + epsgCode + '">(EPSG:' + epsgCode + ')</a>')
}

/* Adiciona a barra de ferramentas com os botões definidos */

var buttonsBar = [
    selectButton,
    infoButton,
    searchButton,
    legendButton,
    geolocationButton,
    measurementButton
]

L.easyBar(buttonsBar, {
    position: 'bottomright'
}).addTo(map);

/* Adicionando tooltips aos botões */

$('button').tooltip({
    placement: 'left',
    trigger : 'hover'
})

$('.leaflet-control-layers-toggle').attr("title","Controle de Camadas");
$('.leaflet-control-layers-toggle').tooltip({
    placement: 'left',
    trigger : 'hover'
})

$('#webgente-coordinates-container').tooltip({
    placemente: 'top',
    trigger : 'hover'
})

$('.leaflet-control-zoom-in').tooltip({
    placemente: 'left',
    title: 'Controles de Zoom',
    trigger : 'hover'
})

$('.leaflet-control-zoom-out').tooltip({
    placemente: 'right',
    title: 'Controles de Zoom',
    trigger : 'hover'
})

function tooltipForDrawing () { // Chamada sempre que for habilitada a ferramenta de desenho
    $("[class*='leaflet-draw-draw']").tooltip({
        placement: 'right',
        trigger : 'hover'
    })
}

// Remoção de tooltips no clique fora da tooltip em mobile
$('body').on('click', function () {
    if ($("[id*='tooltip']") != undefined) $("[id*='tooltip']").tooltip('hide')
})






/* DEIXAR POR ÚLTIMO NO CÓDIGO: Desativando funções desabilitadas pelas configurações */

if (home_enabled == 0) {
    home.removeFrom(map)
}
if (select_enabled == 0) {
    selectButton.removeFrom(map)
}
if (information_enabled == 0) {
    infoButton.removeFrom(map)
}
if (search_enabled == 0) {
    searchButton.removeFrom(map)
}
if (legend_enabled == 0) {
    legendButton.removeFrom(map)
    $("#webgente-legend-container").hide()
}
if (geolocation_enabled == 0) {
    geolocationButton.removeFrom(map)
}
if (measurement_enabled == 0) { 
    measurementButton.removeFrom(map)
}
if (coordinates_enabled == 0) {
    $("#webgente-coordinates-panel").hide()
}
