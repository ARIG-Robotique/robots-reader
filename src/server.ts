import app from './robot';
const PORT = 4100;

app.listen(PORT, () => {
    console.log('Express server listening on port ' + PORT);
});
