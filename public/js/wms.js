var gfiAjax; // Criando uma instancia global do AJAX para controle de execução junto ao backend

/* Expandindo a classe nativa do Leaflet L.TileLayer.WMS para adicionar 
e remover em uma variavel a lista de camadas ativas, o getFeatureInfo
só estará habilitado para as camadas inicializadas por L.TileLayer.gfiWMS */

L.TileLayer.gfiWMS = L.TileLayer.WMS.extend({
    onAdd: function (map) {
      L.TileLayer.WMS.prototype.onAdd.call(this, map);
      getLegendGraphics(this);
      activeLayers.push(this.options.layers);
      setMapStateInURL();
    },
    
    onRemove: function (map) {
      L.TileLayer.WMS.prototype.onRemove.call(this, map);
      removeLegendGraphics(this);
      activeLayers.splice(activeLayers.indexOf(this.options.layers),1);
      setMapStateInURL();
    }
});

L.tileLayer.gfiWMS = function (url, options) {
    return new L.TileLayer.gfiWMS(url, options);  
};

/* Adicionando evento de click no mapa para execução do getFeatureInfo */

map.addEventListener('click', getFeatureInfo);

popup = new L.Popup({maxWidth: 500}) // Instanciando um popup com dimensões máximas 

/* Função de getFeatureInfo junto ao backend */

function getFeatureInfo(e) {

    params = {
        service: 'WMS',
        request: 'GetFeatureInfo',
        version: '1.1.1',
        feature_count: 50,
        srs: 'EPSG:4326',
        bbox: map.getBounds()._southWest.lng+","+map.getBounds()._southWest.lat+","+map.getBounds()._northEast.lng+","+map.getBounds()._northEast.lat,
        width: map.getSize().x,
        height: map.getSize().y,
        x: map.layerPointToContainerPoint(e.layerPoint).x,
        y: map.layerPointToContainerPoint(e.layerPoint).y,
        layers: activeLayers,
        query_layers: activeLayers
    }  
    
    if (gfi && activeLayers.length>0) { // Check se função de Visualizar Informações está habilitada e se há camadas habilitadas
        if (gfiAjax && gfiAjax.readystate != 4){
            gfiAjax.abort()
        }
    
        gfiAjax = $.ajax({
            url: '/gfi/'+ Object.values(params).join('/'),
            success: function (data, status, xhr) {
                popup
                    .setLatLng(e.latlng)
                    .setContent(JSONcontentParser(data));
                map.openPopup(popup);
            },
            error: function (xhr, status, error) {
                console.log(error)
            }
        });
    };    
};

/* Formatação do conteudo JSON exibido no GetFeatureInfo para uma tabela */

function JSONcontentParser (data) {

    if (data.features.length == 0) { return 'Nenhum recurso selecionado ou talvez você não tenha permissão para ver isso!'}

    /* Esta função recebe um JSON resultante do GetFeatureInfo e o formata para exibição em um formato adequado aos dados cadastrais */

    var content = [];

    for (i = 0; i < data.features.length; i++) {
        
        const element = data.features[i];
        var lbl = element.id.split('.')[0].split('_')[1]+': '+(featureCadasterId(element) != null ? featureCadasterId(element): element.id.split('.')[0]);
        content.push('<div class="popup-inner-div"><p><a class="link-table-collapse" style="font-size: medium" data-toggle="collapse" href="#row-'+i+'">'+lbl+'</a></p></div><div id="row-'+i+'" class="panel-collapse collapse"><div class="panel-body">');
        var table = ['<table style="font-size: medium; width: 450px"><tr><th>Atributo</th><th>Valor</th></tr>'];

        for (j = 0; j < Object.keys(element.properties).length; j++) {    

            var table_row = '<tr><td>'+Object.keys(element.properties)[j]+'</td><td>'+attributeFormatter(Object.values(element.properties)[j],Object.keys(element.properties)[j])+'</td></tr>';
            table.push(table_row);           
        };
        table.push('</table></div></div>')
        content.push(table.join(''));
    };
    
    content = content.join('');

    return content;
}

/* Funções auxiliares do JSONcontentParser */

/* Definindo o ID que aparece para identificar a feição na lista de tabelas disponíveis no Popup */

function featureCadasterId (element) {

    var properties = element.properties;

    var keys = Object.keys(properties);
    var values = Object.values(properties);

    if (keys.find(a =>a.includes("insc")) !== undefined) { // Retorna o primeiro atributo cujo nome contem a substring 'insc'
        index = keys.indexOf(keys.find(a =>a.includes("insc"))) // Procura o indice do atributo contendo 'insc'
        return values[index]; // Retorna o valor do atributo contendo 'insc'
    } else {
        return element.id.split('.')[1] // Caso não encontrado nenhum atributo que se encaixe nas instancias superiores retorna a chave primária da feição
    }            
}

/* Check se o atributo de um element é um link para formata-lo */

function attributeFormatter(element,keys) {

    if (typeof(element) == 'string') { 
        // Formatação de strings
        if(keys.indexOf('path_360_min') != -1) { 
            // Substitui o HTML do Popup (leaflet-popup-content) por um visualizador 360
            return '<a href =#  dir="'+element+'"  id = "path_360_min" onClick = "open360ViewerMin()">Visualizar panorama 360°</a>'
        } else if (keys.indexOf('path_360') != -1) {
            return '<a href =#  dir="'+element+'"  id = "path_360" onClick = "open360Viewer()">Visualizar panorama 360°</a>'
        } else if (element.includes('http')){ 
            // Se um dos valores contiver a substring 'http' formatar como link
            return '<a target="_blank" href="'+element+'">Link</a>'
        } else return element // Retorno se string nao for link
    } else return element // Retorno se nao for string
}

/* Formata a classe popup-inner-div com um panorama 360 e volta pra tabela de atributos */

function open360Viewer() {
 
    element = $('#path_360').attr('dir');

    old_html = $('.leaflet-popup-content').html()

    html = '<div id="container-psv"></div>'

    $('.leaflet-popup-content').html(html) // Inserir aqui o HTML do Visualizador

    var div = document.getElementById('container-psv');
    var PSV = new PhotoSphereViewer({
        panorama: element,
        container: div,
        time_anim: 3000,
        minFov: 5,
        loading_img: 'img/loading.gif',
        navbar: ['autorotate', 'zoom'],
        navbar_style: {
            backgroundColor: 'rgba(58, 67, 77, 0.7)'
        },
    });
}

function open360ViewerMin() {

    element = $('#path_360_min').attr('dir');

    old_html = $('.leaflet-popup-content').html()

    html = '<div id="container-psv"></div>'

    $('.leaflet-popup-content').html(html) // Inserir aqui o HTML do Visualizador

    var div = document.getElementById('container-psv');
    var PSV = new PhotoSphereViewer({
        panorama: window.location.origin + element,
        container: div,
        time_anim: 3000,
        minFov: 5,
        loading_img: 'img/loading.gif',
        navbar: ['autorotate', 'zoom'],
        navbar_style: {
            backgroundColor: 'rgba(58, 67, 77, 0.7)'
        },
    });
}

/* Função para obter a legenda do Geoserver */

function getLegendGraphics(layer) {

    params = {
        request: 'GetLegendGraphic',
        version: layer.wmsParams.version,
        format: 'image/png',
        layer: layer.options.layers,
        transparent: true
    } 

    url = layer._url + Object.entries(params).map(e => e.join('=')).join('&');

    $.ajax({
        url: url,
        xhrFields: {
           responseType: 'blob'
        },
        success (data) {
           const url = window.URL || window.webkitURL;
           const src = url.createObjectURL(data);

            /* Switch para o caso de utilização de legendas customizadas
            Tais legendas são definidas no Geoserver e devem conter uma
            espécie de cabeçalho ou texto indicando a que se refere o 
            símbolo, caso o administrador prefira pelo não emprego das 
            legendas customizadas o sistema irá atribuir o título da camada
            sobre o símbolo */

            if (custom_legend_enabled == 1) {
                img = '<div class="webgente-legend-graphic-container" id="legend-'+layer.options.layers+'"><img id="legend-graphic-'+layer.options.layers+'" class="legend-image" src="'+src+'"></img></div>'
                if (document.getElementById('webgente-legend-container').children.length != 0) { // Caso exista mais de uma imagem na legenda a imagem é adicionada com um <hr> acima
                 img = '<div class="webgente-legend-graphic-container" id="legend-'+layer.options.layers+'"><hr><img id="legend-graphic-'+layer.options.layers+'" class="legend-image" src="'+src+'"></img></div>'
                }
            } else {
                img = '<div class="webgente-legend-graphic-container" id="legend-'+layer.options.layers+'"><p class="webgente-legend-layer-title">'+layer.options.layers.split(':')[1]+'</p><img id="legend-graphic-'+layer.options.layers+'" class="legend-image" src="'+src+'"></img></div>'
            }
           
            $('.webgente-legend-container').append(img)
            checkLegendContainer()
        }
    });    
    return null
}

function checkLegendContainer() {
    if ($('.webgente-legend-graphic-container').length != 0 && $('#webgente-legend-container').data('state') == 'enabled' && legend_enabled == 1) {
        $('.webgente-legend-container').show('0.3s')
    } else {
        $('.webgente-legend-container').hide()
    }
}


$(document).ready(checkLegendContainer()); // Verifica se o container da legenda deveria estar aparecendo 

function removeLegendGraphics(layer) {
    document.getElementById('legend-'+layer.options.layers).remove()    
    checkLegendContainer()
    return null
}