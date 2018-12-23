import robotApp from './robotApp';

const PORT = 4100;

robotApp.listen(PORT, () => {
    console.log('Express server listening on port ' + PORT);
});
