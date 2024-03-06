const fs = require("fs");

// Read the JSON file
const data = fs.readFileSync("/home/pc/Desktop/Begining/Ai/JS/chatwithpdf/data.json");
const movies = JSON.parse(data);

console.log(movies);

const output = movies.map((movie)=>{
    return ({
        "metadata":{
            id:movie.id,
            original_language:movie.title,
            original_title:movie.original_title,
            popularity:movie.popularity,
            release_date:movie.release_date,
            vote_average:movie.vote_average,
            vote_count:movie.vote_count,
            revenue:movie.revenue,
            tagline:movie.tagline,
            poster_url:movie.poster_url,
            adult:movie.adult,
        },
        "embedded_data":{
            overview:movie.overview,
            genre:movie.genre
        }
    })
});

// Write the output array to output.json
fs.writeFileSync('output.json', JSON.stringify(output, null, 2));
