document.addEventListener('DOMContentLoaded', () => {
    const dispatchBtns = document.querySelectorAll('.btn-dispatch');
    
    dispatchBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const taskItem = e.target.closest('.task-item');
            const taskInfo = taskItem.querySelector('h3').innerText;
            
            btn.innerText = 'Dispatched';
            btn.style.backgroundColor = '#d29922'; // Orange/Yellow status
            btn.disabled = true;
            
            taskItem.classList.remove('pending');
            taskItem.classList.add('dispatched');
            
            console.log(`Fire Team dispatched to: ${taskInfo}`);
        });
    });
});
