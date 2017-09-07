var express = require('express');
var fs = require('fs');
var request = require('request');
var app     = express();
var dom = require('xmldom').DOMParser
var xpath = require('xpath')
var Webtask = require('webtask-tools');
app.use(require('body-parser').json());

app.get('/amazon/:asin', function(req, res){
    var asin = req.params.asin
    url = 'https://www.amazon.in/gp/offer-listing/' + asin; 

    request(url, function(error, response, html){
        var allVendors = [];
        if(!error){
            var doc = new dom().parseFromString(html)
            var sellerDivs = xpath.select('//div[contains(@class, "a-row a-spacing-mini olpOffer")]', doc);
            var paths = {'vendorPrice' : 'div/span/span/text()', 'deliveryCharge' : 'div/p[contains(@class, "olpShippingInfo")]/span/span[contains(@class, "olpShippingPrice")]/span/text()', 'name' : 'div/h3[contains(@class, "olpSellerName")]/span/a/text()'};
            allVendors = sellerDivs.map(function(elem) {
                var newObject = Object.keys(paths).reduce(function(previous, current) {
                    previous[current] = xpath.select(paths[current], elem).toString(); 
                    return previous;
                }, {});
                return newObject;
            });
        }
        else {
            console.log(error);
        }
        //res.send(JSON.stringify(allVendors, null, 4))
        res.json(allVendors);
    }) ;
});

app.get('/flipkart/:fsn', function(req, res) {
    var fsn = req.params.fsn;
    var fkurl = "https://www.flipkart.com/api/3/page/dynamic/product-sellers";
    var postData = "{\"requestContext\":{\"productId\":\"" + fsn + "\"},\"locationContext\":{\"pincode\":\"500050\"}}";
    var pDataJson = {"requestContext" : {"productId" : fsn}, "locationContext" : {"pincode" : "500050"}}
    var uagent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36";
    var ua = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36 FKUA/website/41/website/Desktop"; //uagent + " FKUA/website/41/website/Desktop";
    var allVendors = [];
    request({
        headers: {'content-type' : 'application/json', 'User-Agent' : uagent, 'x-user-agent' : ua },
        url:     fkurl, 
        method: "POST",
        json:    pDataJson //postData 
    }, function(error, response, jsonData){
        var sellers = jsonData["RESPONSE"]["data"]["product_seller_detail_1"]["data"];
        //res.send("Hello")
        if(!error) {
            allVendors = sellers.map(function(elem) {
                var prices = elem["value"]["pricing"]["value"];
                var delivery = prices["deliveryCharge"]["value"];
                var value = prices["prices"];
                var fsp = "";
                for(j = 0; j < value.length; j++) {
                    if(value[j]["priceType"] == "FSP")
                        fsp = value[j]["value"]; 
                }
                sellerName = elem["value"]["sellerInfo"]["value"]["name"];
                return {"vendorPrice" : fsp, "deliveryCharge" : delivery, "name" : sellerName};
            });
        }
        else {
            console.log(error);
        }
        allVendors.sort(function(a,b) {return ((a.vendorPrice+a.deliveryCharge) > (b.vendorPrice + b.deliveryCharge)) ? 1 : (((b.vendorPrice+b.deliveryCharge) > (a.vendorPrice+a.deliveryCharge)) ? -1 : 0);} );
        res.json(allVendors);
        //res.send(JSON.stringify(allVendors, null, 4))
    });
});

module.exports = Webtask.fromExpress(app);
