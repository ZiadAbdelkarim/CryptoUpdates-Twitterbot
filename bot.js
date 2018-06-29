//Dependencies
global.fetch = require('node-fetch');
var Twit = require('twit');
const cc = require('cryptocompare');
var config = require('./config');
var config2 = require('./config2');
var CryptoNewsAPI = require('crypto-news-api').default;
const CNapi = new CryptoNewsAPI(config2);
var T = new Twit(config);

//Time variables
var d = new Date();
var date = d.getDate();

//Loop variables
var firstOfMonth = false;
var newsTweets = 0;
var num = 0; 

//status variables
var tweet = { status: " "};
var BTC_ETH_price= {
    btc: undefined, 
    btc_change: undefined,
    eth: undefined,
    eth_change: undefined
};

//Main bot loop
function start(){
    d = new Date();
    var min = d.getMinutes();
    console.log(min);

    if(min == 0){
        
        num = 1;         
        tweetHelper();
       
    }else if(min == 30){
        num = 2
        tweetHelper();
    }

    //Every first of the month the bot will tweet last months first price and compare it to the current price
    if(!firstOfMonth){         
        checkDate();
    }else if(firstOfMonth && d.getDate() != 1){
         firstOfMonth = false;
    }
    //loop
    setTimeout(start, 1000 * 60);
}

//--------------------Loop Call-----------------------------
//Calls itself every 60 seconds to check current time and act upon that
setTimeout(start, 1000 * 60);
//---------------------------------------------------------------


//Is necessary for posting tweets to allocate time for retrieval of data from other API's
function tweetHelper(){
    if(num == 1){
        priceTweet();        
    }else if(num == 2){
        newsTweet();
    }else if(num == 3){
        //Not necessary to put anything in here because Check date changes num to 3 and calls tweetHelper
    }
    num = 0;
    setTimeout(tweetIt, 1000 * 5);
}

//Gathers data from api and formats tweet to be sent 
function priceTweet(){ 
    //Retrieving prices
    cc.priceFull(['BTC', 'ETH'], ['USD']).then(prices => {
        
        BTC_ETH_price.btc = prices.BTC.USD.PRICE;
        BTC_ETH_price.eth = prices.ETH.USD.PRICE;
        BTC_ETH_price.btc_change = prices.BTC.USD.CHANGE24HOUR;
        BTC_ETH_price.eth_change = prices.ETH.USD.CHANGE24HOUR;
        console.log('acquiring prices');

    }).catch(console.error);


    cc.coinList().then(coinList => {
        console.log('coinList');
        tweet.status = coinList.Data.BTC.FullName + ' price: $' + BTC_ETH_price.btc + ', 24HR change: ' + BTC_ETH_price.btc_change.toFixed(2) +'\n'
                     + coinList.Data.ETH.FullName + ' price: $' + BTC_ETH_price.eth + ', 24HR change: ' + BTC_ETH_price.eth_change.toFixed(2); 

        console.log(tweet.status);   
        
     }).catch(console.error); 
     
    
}

//This functions tweets the current status
function tweetIt(){   
    T.post('statuses/update', tweet, function(err, data, response) {
        if(err){
            console.log(err);
        }else{
            console.log(data);           
        }
    });  
    //To Reset loop
    num = 0;   
}

//Gathers data from api and formats news tweet to be sent 
function newsTweet(){
    CNapi.getTopNews().then(articles => { 
        var temp = ''; 

        //Iterating through the articles of the API
        for(var i = 0; i < articles[newsTweets].coins.length; i++){
            temp += ' #' + articles[newsTweets].coins[i].tradingSymbol;
        }

        
        tweet.status = articles[newsTweets].description + temp + ' ' + articles[newsTweets].url;
        console.log(tweet.status);

        //Will only iterate through the top 24 articles of the day and restart
        newsTweets++;
        if(newsTweet == 24){
            newsTweets = 0;
        }
    }).catch(console.error);
}

//This function checks for the first of every month and changes the status to be the monthly change report
function checkDate(){
    //Date Info
    d = new Date();
    date = d.getDate();
    var year = d.getFullYear();
    var month = d.getMonth() + 1;
    //console.log(month);

    //For reverting the month back one to retrieve last months pricings
    if(month == 1){
        //If the month is january, must also subtract one from the year
        year--; 
        month = 12;

    }else{
        month--;
    }
    
    //converting to date paramaters for API call 
    var date_string = year + '-'+ month +'-01';
    //price variables
    var oldPrice; 
    var newPrice;
    console.log(date_string);

    //If it is the first of the month retrieve data and format status to be tweeted
    if(date == 1){
        
        cc.priceHistorical('BTC', ['USD'], new Date(date_string)).then(prices => {
            oldPrice = prices.USD;            
            console.log(prices);
        }).catch(console.error);

        cc.priceFull(['BTC'], ['USD']).then(prices => {             
            newPrice = prices.BTC.USD.PRICE;             
            console.log(prices);    
                       
        }).catch(console.error);


        setTimeout(function(){
            var change = newPrice - oldPrice; 
            var percentChange = (change/oldPrice) * 100;
            num = 3; 
            firstOfMonth = true;
            tweet.status = 'Last Month Bitcoin was: $' + oldPrice + ', it is currently: $' + newPrice + '\n' + 'Percent change: ' + percentChange.toFixed(2) + '%';
            console.log(tweet.status);
            tweetHelper();

        }, 2000);

    }

}
