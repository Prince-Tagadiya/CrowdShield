document.addEventListener('DOMContentLoaded', () => {
    const dispatchBtns = document.querySelectorAll('.btn-dispatch');
    
    dispatchBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const taskItem = e.target.closest('.task-item');
            const taskInfo = taskItem.querySelector('h3').innerText;
            
            btn.innerText = 'Investigating';
            btn.style.backgroundColor = '#d29922';
            btn.disabled = true;
            
            console.log(`Police Team dispatched to: ${taskInfo}`);
        });
    });
});
