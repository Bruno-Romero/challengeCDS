# Challenge codigo del sur

In order to use the app:

* clone the repo
* open console in your repo and execute : npm install
* and execute: node app.js

Now to consume the services you can use your favorite http request handler and consume the following services:

Sign user example:

url: http://localhost:3000/signin
body:
{
    "email": "mail@gmail.com",
    "firstName" : "your name",
    "lastName" : "last name",
    "password" : "password"
}

Log in user example:
url: http://localhost:3000/login
body:
{
    "email": "mail@gmail.com",
    "password" : "password"
}

Get movies example:

(keyword is not required)
url http://localhost:3000/getMovies?keyword=spiderman

Add favorite example:

http://localhost:3000/addFav

body:
{
    "id":"9613",
    "token":"1342"
}

Get favorites example:

http://localhost:3000/getFav
body:
{
    "token":"0"
}
