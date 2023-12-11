const express = require('express');
const fs = require('fs');
const axios = require('axios');
const constants = require('./constants.js')
const validator = require("validator");
const crypto = require("crypto");
const {response} = require("express");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let usersNumber;

function isTokenValid(token){
    return token>-1 && usersNumber>=parseInt(token);
}

function checkEmail(email) {
    const isValid= validator.isEmail(email);
    let isAvailable=true;
    if(isValid) {
        try {
            const usersData = fs.readFileSync(constants.usersPath, {encoding: 'utf8'})
            const users = usersData === "" ? [] : JSON.parse(usersData)
            for (let user in users) {
                if (users[user].email === email) {
                    isAvailable=false;
                    break;
                }
            }
        } catch (error){
            console.log(error)
            response.send("internal error")
        }
    }
    return isAvailable && isValid;
}

function sha256Hash(inputString) {
    const hash = crypto.createHash('sha256');
    hash.update(inputString);
    return hash.digest('hex');
}

app.listen(constants.port, () => {
    console.log(`Server is listening at http://localhost:${constants.port}`);
    const usersData=fs.readFileSync(constants.usersPath, {encoding:'utf8'});
    const users= usersData==="" ? [] : [...JSON.parse(usersData)]
    usersNumber= users.isEmpty? -1:users.length-1;
});

app.post('/signin',  (request, response) =>{
    const email= request.body.email;
    const firstName= request.body.firstName;
    const lastName= request.body.lastName;
    const password= request.body.password;
    if(firstName==null){
        response.send('first name missing');
    }
    else if(lastName==null){
        response.send('last name missing');
    }
    else if(password==null || password.length<8){
        response.send('password missing or lenght lesser than 8 characters');
    }
    else if(email==null){
        response.send('email missing');
    }
    else if(constants.forbiddenCharacters.test(firstName+lastName+email)){
        response.send('first name, last name and email must not contain any of the following characters: " { } [ ] : ')
    }
    else if (!checkEmail(email)){
        response.send('email is used or not valid');
    }
    else{
        const userData={
            email: email,
            firstName: firstName,
            lastName: lastName,
            password: sha256Hash(password)
        };
        let users;
        try {
            const usersData = fs.readFileSync(constants.usersPath, {encoding: 'utf8'});
            users = usersData === "" ? [userData] : [...JSON.parse(usersData), userData];
            fs.writeFileSync(constants.usersPath, JSON.stringify(users), {encoding: 'utf8'});
            usersNumber++;
        }catch (error){
            console.log(error);
            response.send('internal error');
        }
        response.send('user succesfully created');
    }
})

app.post('/login', (request, response) =>{
    const email= request.body.email;
    const password= request.body.password;
    let foundUser=null;
    try {
        const usersData = fs.readFileSync(constants.usersPath, {encoding: 'utf8'});

        const jsonData = usersData==="" ? []:JSON.parse(usersData);
        for (const user in jsonData) {
            if (jsonData[user].email === email && jsonData[user].password === sha256Hash(password)) {
                foundUser = user;
                break;
            }
        }
        if (foundUser == null) {
            response.send('invalid credentials')
        } else {
            response.send('logged in, your token is:' + foundUser)
        }
    }catch (error){
        console.log(error);
        response.send('internal error');
    }
})

app.get('/getMovies', async (request, response) =>{
    const keyword= request.query.keyword;
    let results;
    if(keyword!=null) {
        const encodedKeyword = encodeURIComponent(keyword);
        const url = constants.baseSearchUrl + encodedKeyword + "&api_key=" + constants.apiKey;
        try{
        results = await axios.get(url);
        } catch (error){
            console.log(error);
            response.send('internal error');
        }
    }
    else{
        try{
        results = await axios.get(constants.discoverMoviesUrl);
        } catch (error){
            response.send('internal error')
        }
    }
    let movies = [];
    for (let movieResult in results.data.results) {
        let suggestionScore = Math.floor(Math.random() * 99)
        let movie = {
            title: results.data.results[movieResult].title,
            suggestionScore: suggestionScore,
            id: results.data.results[movieResult].id
        }
        movies.push(movie)
    }
    movies.sort((a, b) => a.suggestionScore - b.suggestionScore);
    response.send(movies)
})

app.post('/addFav', async (request, response) =>{
    const id= request.body.id;
    const token= request.body.token;
    if(isTokenValid(token)){
        try {
            const favMoviesId = fs.readFileSync(constants.favMoviesPath, {encoding: 'utf8'});
            let jsonData = favMoviesId === "" ? [] : JSON.parse(favMoviesId);
            const url = constants.baseFindUrl + id + "?api_key=" + constants.apiKey;
            const results = await axios.get(url);
            const movieData = {
                data: results.data,
                addedAt: new Date()
            }
            if (jsonData.at(token) == null) {
                jsonData[token] = [movieData];
            } else {
                jsonData[token].push(movieData);
            }
            fs.writeFileSync(constants.favMoviesPath, JSON.stringify(jsonData), {encoding: 'utf8'});
        }catch (error){
            console.log(error)
            response.send('internal error')
        }

        response.send('movie with id: '+id+' succesfully added to favorites');
    }
    else{
        response.send('invalid token');
    }
})

app.get('/getFav', async (request, response) =>{
    const token= request.body.token;
    if(isTokenValid(token)){
        try {
            const favMoviesId = fs.readFileSync(constants.favMoviesPath, {encoding: 'utf8'});
            const jsonData = favMoviesId === "" ? [] : JSON.parse(favMoviesId);
            if (jsonData[token]==null || jsonData[token].isEmpty) {
                response.send('user has no favorites movies');
            } else {
                let movies = [];
                for (let id in jsonData[token]) {
                    let suggestionScore = Math.floor(Math.random() * 99)
                    let movie = {
                        data: jsonData[token][id].data,
                        suggestionForTodayScore: suggestionScore,
                        addedAt: jsonData[token][id].addedAt
                    }
                    movies.push(movie)
                }
                movies.sort((a, b) => a.suggestionForTodayScore - b.suggestionForTodayScore);
                response.send(movies)
            }
        } catch (error){
            console.log(error);
            response.send('internal error');
        }
    }
    else{
        response.send('invalid token');
    }
})